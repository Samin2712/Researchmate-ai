# 🤝 Contributing to ResearchMate AI

First off, thank you for considering contributing to ResearchMate AI! It's people like you that make this project such a great tool for students and researchers worldwide.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Code Guidelines](#code-guidelines)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Community](#community)

---

## 📜 Code of Conduct

This project and everyone participating in it is governed by our commitment to creating a welcoming and inclusive environment. By participating, you are expected to uphold this code.

**Our Standards:**
- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

**Unacceptable Behavior:**
- Harassment or discriminatory language
- Trolling, insulting/derogatory comments
- Public or private harassment
- Publishing others' private information

---

## 🚀 Getting Started

### Prerequisites

Before contributing, make sure you have:

- **Python 3.11+** installed
- **Node.js 18+** with npm
- **Git** for version control
- **PostgreSQL 15+** (or Docker)
- A **GitHub account**

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/researchmate-ai.git
   cd researchmate-ai
   ```
3. **Add upstream remote:**
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/researchmate-ai.git
   ```

---

## 💻 Development Setup

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Copy environment file
cp .env.example .env
# Edit .env with your API keys

# Run migrations
alembic upgrade head

# Start dev server
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Start dev server
npm run dev
```

### Docker Setup (Alternative)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## 🎯 How to Contribute

### Types of Contributions

We welcome many types of contributions:

- 🐛 **Bug fixes**
- ✨ **New features**
- 📝 **Documentation improvements**
- 🎨 **UI/UX enhancements**
- ⚡ **Performance optimizations**
- 🧪 **Test coverage**
- 🌐 **Translations**

### Contribution Workflow

1. **Find or create an issue**
   - Check existing issues or create a new one
   - Discuss your approach before coding

2. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

3. **Make your changes**
   - Write clean, documented code
   - Follow our code guidelines
   - Add tests for new features

4. **Test your changes**
   ```bash
   # Backend tests
   cd backend
   pytest
   
   # Frontend tests
   cd frontend
   npm test
   
   # E2E tests
   npm run test:e2e
   ```

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add awesome feature"
   ```

6. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a Pull Request on GitHub

---

## 📝 Code Guidelines

### Python (Backend)

**Style Guide:**
- Follow [PEP 8](https://pep8.org/)
- Use [Black](https://black.readthedocs.io/) for formatting
- Use [Flake8](https://flake8.pycqa.org/) for linting
- Use [MyPy](http://mypy-lang.org/) for type checking

**Example:**

```python
from typing import List, Optional
from pydantic import BaseModel


class Document(BaseModel):
    """Document model with metadata"""
    
    id: str
    title: str
    authors: List[str]
    year: Optional[int] = None
    
    class Config:
        """Pydantic config"""
        orm_mode = True


async def process_document(
    document_id: str,
    user_id: str
) -> Document:
    """
    Process a document and extract metadata.
    
    Args:
        document_id: Unique document identifier
        user_id: User who owns the document
        
    Returns:
        Processed document with metadata
        
    Raises:
        ValueError: If document not found
    """
    # Implementation here
    pass
```

**Code Formatting:**

```bash
# Format code
black app/

# Check linting
flake8 app/

# Type checking
mypy app/
```

### TypeScript/React (Frontend)

**Style Guide:**
- Follow [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use [Prettier](https://prettier.io/) for formatting
- Use [ESLint](https://eslint.org/) for linting
- Prefer functional components with hooks

**Example:**

```typescript
import { useState, useEffect } from 'react';
import { Document } from '@/types/document.types';
import { documentService } from '@/services/api';

interface DocumentListProps {
  userId: string;
  onSelect?: (document: Document) => void;
}

/**
 * DocumentList component displays user's uploaded documents
 */
export const DocumentList: React.FC<DocumentListProps> = ({ 
  userId, 
  onSelect 
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const docs = await documentService.list(userId);
        setDocuments(docs);
      } catch (error) {
        console.error('Failed to fetch documents:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDocuments();
  }, [userId]);
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return (
    <div className="document-list">
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          document={doc}
          onClick={() => onSelect?.(doc)}
        />
      ))}
    </div>
  );
};
```

**Code Formatting:**

```bash
# Format code
npm run format

# Check linting
npm run lint

# Type checking
npm run type-check
```

### General Guidelines

**DRY (Don't Repeat Yourself):**
- Extract reusable logic into functions/hooks
- Create shared components for common UI patterns

**KISS (Keep It Simple, Stupid):**
- Prefer simple solutions over complex ones
- Write code that's easy to understand

**YAGNI (You Aren't Gonna Need It):**
- Don't add functionality until it's needed
- Focus on current requirements

**Comments:**
- Write self-documenting code
- Add comments for complex logic
- Document public APIs

---

## 📋 Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat:** A new feature
- **fix:** A bug fix
- **docs:** Documentation changes
- **style:** Code style changes (formatting, etc.)
- **refactor:** Code refactoring
- **perf:** Performance improvements
- **test:** Adding or updating tests
- **chore:** Maintenance tasks
- **ci:** CI/CD changes

### Examples

```bash
# Simple feature
feat: add document summarization

# Bug fix with scope
fix(chat): resolve citation parsing error

# Breaking change
feat!: redesign API authentication

BREAKING CHANGE: JWT tokens now require refresh token rotation

# Multiple changes
feat(backend): add hybrid search
feat(frontend): update search UI
test: add search integration tests
```

### Rules

- Use present tense ("add" not "added")
- Use imperative mood ("move" not "moves")
- First line max 72 characters
- Reference issues in footer (`Fixes #123`)

---

## 🔄 Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] New tests added for features
- [ ] Documentation updated
- [ ] No console.log() or print() statements
- [ ] Branch is up-to-date with main

### PR Title

Use conventional commit format:
```
feat: add knowledge graph visualization
fix: resolve PDF parsing issue
```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Fixes #123
Related to #456

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
[Add screenshots here]

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### Review Process

1. **Automated checks** run (CI/CD)
2. **Code review** by maintainer(s)
3. **Changes requested** (if needed)
4. **Approval** and merge

### After Merge

- Delete your branch
- Pull latest main
- Start next contribution!

---

## 🐛 Reporting Bugs

### Before Reporting

- Check existing issues
- Try latest version
- Verify it's reproducible

### Bug Report Template

```markdown
**Describe the bug**
Clear description of the issue

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What should happen

**Screenshots**
If applicable

**Environment:**
- OS: [e.g. Windows 11]
- Browser: [e.g. Chrome 120]
- Version: [e.g. 1.0.0]

**Additional context**
Any other relevant information
```

### Where to Report

- **GitHub Issues:** For bugs and features
- **Discord:** For questions and discussions
- **Email:** For security issues

---

## 💡 Suggesting Features

We love feature ideas! Here's how to suggest one:

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
Clear description of the problem

**Describe the solution you'd like**
What you want to happen

**Describe alternatives you've considered**
Other approaches you thought about

**Additional context**
Mockups, examples, or references

**Would you like to implement this?**
- [ ] Yes, I'd like to work on this
- [ ] No, just suggesting
```

### Feature Discussion

1. Create a GitHub issue with `feature` label
2. Discuss approach with maintainers
3. Get approval before starting
4. Follow contribution workflow

---

## 🧪 Testing Guidelines

### Backend Tests

```python
# tests/test_rag.py

import pytest
from app.services.rag.engine import RAGEngine


@pytest.mark.asyncio
async def test_answer_question():
    """Test RAG engine returns valid answer"""
    engine = RAGEngine()
    
    result = await engine.answer_question(
        query="What is the main contribution?",
        user_id="test_user"
    )
    
    assert result.text is not None
    assert len(result.sources) > 0
    assert 0 <= result.confidence <= 1


@pytest.mark.integration
async def test_document_upload_flow(client):
    """Test full document upload and query flow"""
    # Upload document
    with open("test.pdf", "rb") as f:
        response = await client.post(
            "/api/v1/documents/upload",
            files={"file": f}
        )
    
    assert response.status_code == 200
    doc_id = response.json()["id"]
    
    # Query document
    response = await client.post(
        "/api/v1/chat/ask",
        json={
            "question": "What is this about?",
            "document_ids": [doc_id]
        }
    )
    
    assert response.status_code == 200
    assert "answer" in response.json()
```

### Frontend Tests

```typescript
// components/Chat/ChatInterface.test.tsx

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatInterface } from './ChatInterface';

describe('ChatInterface', () => {
  it('renders chat input', () => {
    render(<ChatInterface />);
    expect(screen.getByPlaceholderText(/ask a question/i)).toBeInTheDocument();
  });
  
  it('sends message on submit', async () => {
    const mockSendMessage = jest.fn();
    render(<ChatInterface onSendMessage={mockSendMessage} />);
    
    const input = screen.getByPlaceholderText(/ask a question/i);
    const button = screen.getByRole('button', { name: /send/i });
    
    fireEvent.change(input, { target: { value: 'Test question' } });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Test question');
    });
  });
});
```

### Running Tests

```bash
# Backend
cd backend
pytest                    # All tests
pytest -v                 # Verbose
pytest tests/unit         # Unit tests only
pytest -k "test_rag"      # Specific test
pytest --cov=app          # With coverage

# Frontend
cd frontend
npm test                  # All tests
npm test -- --coverage    # With coverage
npm run test:watch        # Watch mode

# E2E
npm run test:e2e
```

---

## 📚 Documentation

### When to Update Docs

- New features added
- API changes
- Configuration changes
- Setup process changes

### Documentation Files

- `README.md` - Project overview
- `docs/api.md` - API documentation
- `docs/user-guide.md` - User instructions
- `docs/architecture.md` - Technical details
- Code comments - Inline documentation

### Writing Good Docs

- Clear and concise
- Include examples
- Keep up-to-date
- Add screenshots/diagrams
- Test instructions yourself

---

## 🌍 Internationalization (i18n)

We welcome translations! Here's how to contribute:

1. **Create translation file:**
   ```
   frontend/src/locales/[language_code].json
   ```

2. **Translate strings:**
   ```json
   {
     "common.upload": "Upload",
     "common.cancel": "Cancel",
     "chat.placeholder": "Ask a question..."
   }
   ```

3. **Test translation:**
   - Change language in settings
   - Verify all strings display correctly

4. **Submit PR:**
   - Follow PR process
   - Note language in description

---

## 🎓 Learning Resources

New to the technologies we use?

### Backend
- [FastAPI Tutorial](https://fastapi.tiangolo.com/tutorial/)
- [SQLAlchemy ORM](https://docs.sqlalchemy.org/)
- [Pytest Guide](https://docs.pytest.org/)

### Frontend
- [React Docs](https://react.dev/learn)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

### AI/ML
- [LangChain Docs](https://python.langchain.com/docs/get_started/introduction)
- [ChromaDB Docs](https://docs.trychroma.com/)
- [OpenAI API](https://platform.openai.com/docs)

---

## 👥 Community

### Communication Channels

- **GitHub Issues:** Bug reports and features
- **GitHub Discussions:** Questions and ideas
- **Discord:** Real-time chat and help
- **Twitter:** Updates and announcements
- **Email:** team@researchmate.ai

### Getting Help

**Stuck? Try these steps:**

1. Check documentation
2. Search existing issues
3. Ask in Discord
4. Create new issue

**When asking for help:**
- Describe what you're trying to do
- Include error messages
- Share relevant code
- Mention your environment

---

## 🏆 Recognition

Contributors are recognized in:

- README contributors section
- Release notes
- Project website
- Social media shoutouts

**Hall of Fame:**
Top contributors may receive:
- Special badge/role in Discord
- Featured in blog posts
- Recommendation letters (if requested)

---

## 📋 Checklist for New Contributors

Before your first PR:

- [ ] Read this guide
- [ ] Set up development environment
- [ ] Run tests successfully
- [ ] Make a small change (fix typo, improve docs)
- [ ] Create your first PR
- [ ] Join Discord community
- [ ] Introduce yourself!

---

## 🙏 Thank You!

Every contribution, no matter how small, makes ResearchMate AI better for students and researchers worldwide.

**Special thanks to:**
- All our contributors
- The open-source community
- STEM2Connect organizers
- Our beta testers

---

## 📝 Questions?

If you have questions about contributing:

- Create a GitHub Discussion
- Ask in Discord #contributors channel
- Email: contributors@researchmate.ai

**Happy coding! 🚀**

---

*Last Updated: November 10, 2026*
*Version: 1.0*
