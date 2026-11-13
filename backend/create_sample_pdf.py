"""
Create a sample research PDF for testing RAG system
"""
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.units import inch
import os

def create_sample_research_pdf():
    """Create a sample research paper about AI in education"""
    
    output_path = "sample_ai_research.pdf"
    
    # Create PDF
    doc = SimpleDocTemplate(output_path, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor='darkblue',
        spaceAfter=30,
        alignment=1  # Center
    )
    story.append(Paragraph("Artificial Intelligence in STEM Education", title_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Authors
    author_style = ParagraphStyle('Authors', parent=styles['Normal'], alignment=1, fontSize=12)
    story.append(Paragraph("Dr. Sarah Johnson, Prof. Michael Chen", author_style))
    story.append(Paragraph("Department of Computer Science, Tech University", author_style))
    story.append(Spacer(1, 0.5*inch))
    
    # Abstract
    story.append(Paragraph("Abstract", styles['Heading2']))
    abstract_text = """
    This paper explores the transformative impact of artificial intelligence (AI) on STEM education. 
    We examine how machine learning algorithms, natural language processing, and adaptive learning 
    systems are revolutionizing how students learn science, technology, engineering, and mathematics. 
    Our research demonstrates that AI-powered educational tools can increase student engagement by 
    45% and improve learning outcomes by 32% compared to traditional teaching methods.
    """
    story.append(Paragraph(abstract_text, styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    
    # Introduction
    story.append(Paragraph("1. Introduction", styles['Heading2']))
    intro_text = """
    The integration of artificial intelligence into STEM education represents a paradigm shift in 
    how we approach teaching and learning. Traditional classroom methods often struggle to accommodate 
    diverse learning styles and paces. AI-powered systems can personalize the learning experience, 
    providing real-time feedback and adapting content difficulty based on individual student performance.
    <br/><br/>
    Recent studies show that 78% of educators believe AI will significantly impact education within 
    the next five years. The global AI in education market is projected to reach $20 billion by 2027, 
    with STEM subjects being the primary focus of innovation.
    """
    story.append(Paragraph(intro_text, styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    
    # Section 2
    story.append(Paragraph("2. AI Technologies in Education", styles['Heading2']))
    
    story.append(Paragraph("2.1 Adaptive Learning Systems", styles['Heading3']))
    adaptive_text = """
    Adaptive learning platforms use machine learning algorithms to analyze student performance data 
    and adjust content difficulty in real-time. These systems track metrics such as response time, 
    accuracy rates, and learning patterns to create personalized learning paths. Research conducted 
    at Stanford University found that students using adaptive learning systems scored 23% higher on 
    standardized tests compared to control groups.
    """
    story.append(Paragraph(adaptive_text, styles['Normal']))
    story.append(Spacer(1, 0.2*inch))
    
    story.append(Paragraph("2.2 Intelligent Tutoring Systems", styles['Heading3']))
    tutoring_text = """
    Intelligent tutoring systems (ITS) provide one-on-one instruction using natural language 
    processing and cognitive modeling. These systems can understand student questions, provide 
    explanations, and offer hints when students struggle. A meta-analysis of 107 studies showed 
    that ITS improved learning outcomes with an effect size of 0.42, equivalent to moving from 
    the 50th to 66th percentile.
    """
    story.append(Paragraph(tutoring_text, styles['Normal']))
    story.append(Spacer(1, 0.2*inch))
    
    story.append(Paragraph("2.3 Automated Assessment and Feedback", styles['Heading3']))
    assessment_text = """
    AI-powered assessment tools can evaluate complex student work including essays, code, and 
    mathematical proofs. These systems provide immediate, detailed feedback, allowing students 
    to iterate and improve quickly. Natural language processing models can now grade essays with 
    85% agreement with human graders, while computer science education platforms can analyze code 
    for correctness, efficiency, and style.
    """
    story.append(Paragraph(assessment_text, styles['Normal']))
    story.append(PageBreak())
    
    # Section 3
    story.append(Paragraph("3. Impact on Student Learning", styles['Heading2']))
    impact_text = """
    Our longitudinal study of 2,500 students across 15 schools revealed significant improvements 
    in both engagement and outcomes when AI tools were integrated into STEM curricula:
    <br/><br/>
    • Student engagement increased by 45% as measured by time-on-task and completion rates<br/>
    • Test scores improved by an average of 32% compared to traditional instruction<br/>
    • Achievement gaps between high and low-performing students decreased by 28%<br/>
    • Student confidence in STEM subjects increased by 41%<br/>
    • Teacher satisfaction with instructional tools rose by 67%
    <br/><br/>
    These results suggest that AI technologies, when properly implemented, can address longstanding 
    challenges in STEM education including personalization, scalability, and accessibility.
    """
    story.append(Paragraph(impact_text, styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    
    # Section 4
    story.append(Paragraph("4. Challenges and Considerations", styles['Heading2']))
    challenges_text = """
    Despite promising results, several challenges must be addressed for successful AI integration:
    <br/><br/>
    <b>Data Privacy:</b> AI systems require extensive student data, raising concerns about privacy 
    and security. Educational institutions must implement robust data protection measures and ensure 
    compliance with regulations like FERPA and GDPR.
    <br/><br/>
    <b>Equity and Access:</b> Not all schools have equal access to AI technologies, potentially 
    widening the digital divide. Efforts must be made to ensure equitable distribution of these 
    tools across different socioeconomic communities.
    <br/><br/>
    <b>Teacher Training:</b> Educators need proper training to effectively integrate AI tools into 
    their teaching practice. Professional development programs must emphasize both technical skills 
    and pedagogical strategies for AI-enhanced instruction.
    <br/><br/>
    <b>Algorithmic Bias:</b> AI systems can perpetuate existing biases if not carefully designed 
    and tested. Developers must ensure their algorithms are fair and inclusive across diverse 
    student populations.
    """
    story.append(Paragraph(challenges_text, styles['Normal']))
    story.append(PageBreak())
    
    # Conclusion
    story.append(Paragraph("5. Conclusion", styles['Heading2']))
    conclusion_text = """
    Artificial intelligence is transforming STEM education, offering unprecedented opportunities 
    for personalized, engaging, and effective learning experiences. Our research demonstrates 
    significant improvements in student outcomes, with engagement increasing by 45% and test 
    scores improving by 32%. However, successful implementation requires careful attention to 
    challenges including data privacy, equity, teacher training, and algorithmic bias.
    <br/><br/>
    As AI technologies continue to evolve, educators, researchers, and policymakers must collaborate 
    to ensure these tools are used responsibly and effectively. The future of STEM education will 
    likely involve a hybrid approach that combines the best of human teaching with AI-powered support, 
    creating learning environments that are more adaptive, accessible, and impactful than ever before.
    """
    story.append(Paragraph(conclusion_text, styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    
    # References
    story.append(Paragraph("References", styles['Heading2']))
    references = """
    1. Johnson, S., & Chen, M. (2023). "Machine Learning in STEM Classrooms: A Comprehensive Review." 
    <i>Journal of Educational Technology</i>, 45(3), 234-256.
    <br/><br/>
    2. Smith, A., et al. (2022). "Adaptive Learning Systems: Impact on Student Performance." 
    <i>Educational Research Quarterly</i>, 38(2), 112-134.
    <br/><br/>
    3. National Education Technology Plan (2024). "AI in Education: Opportunities and Challenges." 
    U.S. Department of Education.
    <br/><br/>
    4. Brown, L., & Davis, R. (2023). "Intelligent Tutoring Systems: A Meta-Analysis." 
    <i>Computers & Education</i>, 156, 104-121.
    """
    story.append(Paragraph(references, styles['Normal']))
    
    # Build PDF
    doc.build(story)
    print(f"✅ Created sample research PDF: {output_path}")
    print(f"📄 File size: {os.path.getsize(output_path) / 1024:.1f} KB")
    return output_path

if __name__ == "__main__":
    create_sample_research_pdf()
