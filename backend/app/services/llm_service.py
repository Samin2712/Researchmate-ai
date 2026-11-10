"""
LLM Service - Support for multiple LLM providers
Supports: Google Gemini (FREE), OpenAI, Anthropic
"""
import logging
from typing import Optional, AsyncIterator
from abc import ABC, abstractmethod

# Gemini imports
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

# OpenAI imports
try:
    from openai import AsyncOpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

# Anthropic imports
try:
    from anthropic import AsyncAnthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False

from app.core.config import settings

logger = logging.getLogger(__name__)


class BaseLLMProvider(ABC):
    """Base class for LLM providers"""
    
    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        stream: bool = False
    ) -> str:
        """Generate text response"""
        pass
    
    @abstractmethod
    async def stream_generate(
        self,
        prompt: str,
        system_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> AsyncIterator[str]:
        """Generate streaming text response"""
        pass


class GeminiProvider(BaseLLMProvider):
    """Google Gemini LLM Provider (FREE)"""
    
    def __init__(self, api_key: str, model: str = "gemini-1.5-flash"):
        if not GEMINI_AVAILABLE:
            raise ImportError("google-generativeai not installed. Install with: pip install google-generativeai")
        
        genai.configure(api_key=api_key)
        self.model_name = model
        self.model = genai.GenerativeModel(model)
        logger.info(f"Initialized Gemini provider with model: {model}")
    
    async def generate(
        self,
        prompt: str,
        system_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        stream: bool = False
    ) -> str:
        """Generate text response"""
        try:
            # Combine system prompt and user prompt
            full_prompt = f"{system_prompt}\n\n{prompt}"
            
            generation_config = genai.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            )
            
            response = self.model.generate_content(
                full_prompt,
                generation_config=generation_config
            )
            
            return response.text
        
        except Exception as e:
            logger.error(f"Gemini generation error: {e}")
            raise
    
    async def stream_generate(
        self,
        prompt: str,
        system_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> AsyncIterator[str]:
        """Generate streaming text response"""
        try:
            full_prompt = f"{system_prompt}\n\n{prompt}"
            
            generation_config = genai.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            )
            
            response = self.model.generate_content(
                full_prompt,
                generation_config=generation_config,
                stream=True
            )
            
            for chunk in response:
                if chunk.text:
                    yield chunk.text
        
        except Exception as e:
            logger.error(f"Gemini streaming error: {e}")
            raise


class OpenAIProvider(BaseLLMProvider):
    """OpenAI LLM Provider (Paid)"""
    
    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        if not OPENAI_AVAILABLE:
            raise ImportError("openai not installed. Install with: pip install openai")
        
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = model
        logger.info(f"Initialized OpenAI provider with model: {model}")
    
    async def generate(
        self,
        prompt: str,
        system_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        stream: bool = False
    ) -> str:
        """Generate text response"""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                stream=False
            )
            
            return response.choices[0].message.content
        
        except Exception as e:
            logger.error(f"OpenAI generation error: {e}")
            raise
    
    async def stream_generate(
        self,
        prompt: str,
        system_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> AsyncIterator[str]:
        """Generate streaming text response"""
        try:
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True
            )
            
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        
        except Exception as e:
            logger.error(f"OpenAI streaming error: {e}")
            raise


class AnthropicProvider(BaseLLMProvider):
    """Anthropic Claude LLM Provider (Paid)"""
    
    def __init__(self, api_key: str, model: str = "claude-3-haiku-20240307"):
        if not ANTHROPIC_AVAILABLE:
            raise ImportError("anthropic not installed. Install with: pip install anthropic")
        
        self.client = AsyncAnthropic(api_key=api_key)
        self.model = model
        logger.info(f"Initialized Anthropic provider with model: {model}")
    
    async def generate(
        self,
        prompt: str,
        system_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        stream: bool = False
    ) -> str:
        """Generate text response"""
        try:
            response = await self.client.messages.create(
                model=self.model,
                system=system_prompt,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            return response.content[0].text
        
        except Exception as e:
            logger.error(f"Anthropic generation error: {e}")
            raise
    
    async def stream_generate(
        self,
        prompt: str,
        system_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> AsyncIterator[str]:
        """Generate streaming text response"""
        try:
            async with self.client.messages.stream(
                model=self.model,
                system=system_prompt,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=max_tokens
            ) as stream:
                async for text in stream.text_stream:
                    yield text
        
        except Exception as e:
            logger.error(f"Anthropic streaming error: {e}")
            raise


class LLMService:
    """
    Unified LLM Service with multiple provider support
    Automatically falls back to available providers
    """
    
    def __init__(self):
        self.provider: Optional[BaseLLMProvider] = None
        self._initialize_provider()
    
    def _initialize_provider(self):
        """Initialize LLM provider based on configuration and availability"""
        provider_name = settings.LLM_PROVIDER.lower()
        
        # Try primary provider
        if provider_name == "gemini" and settings.GOOGLE_API_KEY:
            try:
                self.provider = GeminiProvider(
                    api_key=settings.GOOGLE_API_KEY,
                    model=settings.GEMINI_MODEL
                )
                logger.info("✅ Using Google Gemini (FREE)")
                return
            except Exception as e:
                logger.warning(f"Failed to initialize Gemini: {e}")
        
        elif provider_name == "openai" and settings.OPENAI_API_KEY:
            try:
                self.provider = OpenAIProvider(
                    api_key=settings.OPENAI_API_KEY,
                    model=settings.OPENAI_MODEL
                )
                logger.info("✅ Using OpenAI")
                return
            except Exception as e:
                logger.warning(f"Failed to initialize OpenAI: {e}")
        
        elif provider_name == "anthropic" and settings.ANTHROPIC_API_KEY:
            try:
                self.provider = AnthropicProvider(
                    api_key=settings.ANTHROPIC_API_KEY,
                    model=settings.ANTHROPIC_MODEL
                )
                logger.info("✅ Using Anthropic Claude")
                return
            except Exception as e:
                logger.warning(f"Failed to initialize Anthropic: {e}")
        
        # Fallback to any available provider
        logger.warning(f"Primary provider '{provider_name}' not available, trying fallbacks...")
        
        # Try Gemini (FREE)
        if settings.GOOGLE_API_KEY and GEMINI_AVAILABLE:
            try:
                self.provider = GeminiProvider(
                    api_key=settings.GOOGLE_API_KEY,
                    model=settings.GEMINI_MODEL
                )
                logger.info("✅ Using Google Gemini (fallback)")
                return
            except Exception as e:
                logger.warning(f"Failed to initialize Gemini fallback: {e}")
        
        # Try OpenAI
        if settings.OPENAI_API_KEY and OPENAI_AVAILABLE:
            try:
                self.provider = OpenAIProvider(
                    api_key=settings.OPENAI_API_KEY,
                    model=settings.OPENAI_MODEL
                )
                logger.info("✅ Using OpenAI (fallback)")
                return
            except Exception as e:
                logger.warning(f"Failed to initialize OpenAI fallback: {e}")
        
        # Try Anthropic
        if settings.ANTHROPIC_API_KEY and ANTHROPIC_AVAILABLE:
            try:
                self.provider = AnthropicProvider(
                    api_key=settings.ANTHROPIC_API_KEY,
                    model=settings.ANTHROPIC_MODEL
                )
                logger.info("✅ Using Anthropic (fallback)")
                return
            except Exception as e:
                logger.warning(f"Failed to initialize Anthropic fallback: {e}")
        
        # No provider available
        raise RuntimeError(
            "❌ No LLM provider available! Please configure at least one:\n"
            "- Google Gemini (FREE): Set GOOGLE_API_KEY\n"
            "- OpenAI: Set OPENAI_API_KEY\n"
            "- Anthropic: Set ANTHROPIC_API_KEY"
        )
    
    async def generate(
        self,
        prompt: str,
        system_prompt: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        stream: bool = False
    ) -> str:
        """Generate text response"""
        if not self.provider:
            raise RuntimeError("No LLM provider initialized")
        
        return await self.provider.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=temperature or settings.LLM_TEMPERATURE,
            max_tokens=max_tokens or settings.LLM_MAX_TOKENS,
            stream=stream
        )
    
    async def stream_generate(
        self,
        prompt: str,
        system_prompt: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> AsyncIterator[str]:
        """Generate streaming text response"""
        if not self.provider:
            raise RuntimeError("No LLM provider initialized")
        
        async for chunk in self.provider.stream_generate(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=temperature or settings.LLM_TEMPERATURE,
            max_tokens=max_tokens or settings.LLM_MAX_TOKENS
        ):
            yield chunk
    
    def get_provider_info(self) -> dict:
        """Get information about the current provider"""
        if not self.provider:
            return {"provider": "none", "status": "not initialized"}
        
        provider_type = type(self.provider).__name__
        return {
            "provider": provider_type.replace("Provider", "").lower(),
            "status": "active",
            "is_free": isinstance(self.provider, GeminiProvider)
        }


# Global LLM service instance
llm_service = LLMService()
