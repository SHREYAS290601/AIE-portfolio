from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


PAGE_W, PAGE_H = letter
MARGIN = 0.55 * inch
CONTENT_W = PAGE_W - (2 * MARGIN)

NAVY = colors.HexColor("#0f172a")
SLATE = colors.HexColor("#334155")
MUTED = colors.HexColor("#64748b")
BLUE = colors.HexColor("#2563eb")
SKY = colors.HexColor("#e0f2fe")
CYAN = colors.HexColor("#ecfeff")
TEAL = colors.HexColor("#0f766e")
AMBER = colors.HexColor("#f59e0b")
ROSE = colors.HexColor("#e11d48")
INDIGO = colors.HexColor("#4338ca")
SURFACE = colors.HexColor("#f8fafc")
CARD = colors.HexColor("#ffffff")
LINE = colors.HexColor("#d7e3f0")
SOFT_BLUE = colors.HexColor("#eef6ff")
SOFT_GREEN = colors.HexColor("#ecfdf5")
SOFT_AMBER = colors.HexColor("#fff7ed")
SOFT_ROSE = colors.HexColor("#fff1f2")

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "Shreyas_Kulkarni_Portfolio_2026-04-04.pdf"

IMAGE_MULTI_AGENT = Path("/Users/shreyaskulkarni/Downloads/Gemini Generated Image (1).png")
IMAGE_BANKING = Path("/Users/shreyaskulkarni/Downloads/Gemini Generated Image (3).png")
IMAGE_AZURE = Path("/Users/shreyaskulkarni/Downloads/Google Gemini Generated Image.png")


styles = getSampleStyleSheet()
STYLES = {
    "hero_name": ParagraphStyle(
        "hero_name",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=24,
        leading=28,
        textColor=colors.white,
        spaceAfter=0,
    ),
    "hero_sub": ParagraphStyle(
        "hero_sub",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#dbeafe"),
    ),
    "small_caps": ParagraphStyle(
        "small_caps",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=MUTED,
    ),
    "section": ParagraphStyle(
        "section",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=NAVY,
        spaceAfter=0,
    ),
    "section_dark": ParagraphStyle(
        "section_dark",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.white,
        spaceAfter=0,
    ),
    "body": ParagraphStyle(
        "body",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.6,
        leading=13.2,
        textColor=SLATE,
    ),
    "body_light": ParagraphStyle(
        "body_light",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#dbe7f6"),
    ),
    "body_small": ParagraphStyle(
        "body_small",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.4,
        leading=11.3,
        textColor=SLATE,
    ),
    "body_small_muted": ParagraphStyle(
        "body_small_muted",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.2,
        leading=10.8,
        textColor=MUTED,
    ),
    "card_title": ParagraphStyle(
        "card_title",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12.2,
        leading=15,
        textColor=NAVY,
    ),
    "card_title_dark": ParagraphStyle(
        "card_title_dark",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12.2,
        leading=15,
        textColor=colors.white,
    ),
    "metric": ParagraphStyle(
        "metric",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=18,
        textColor=NAVY,
        alignment=TA_CENTER,
    ),
    "metric_label": ParagraphStyle(
        "metric_label",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        textColor=MUTED,
        alignment=TA_CENTER,
    ),
    "footer": ParagraphStyle(
        "footer",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.8,
        leading=9.5,
        textColor=MUTED,
    ),
    "right_footer": ParagraphStyle(
        "right_footer",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.8,
        leading=9.5,
        textColor=MUTED,
        alignment=TA_RIGHT,
    ),
    "mono": ParagraphStyle(
        "mono",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=8.2,
        leading=10.5,
        textColor=colors.HexColor("#dbeafe"),
    ),
}


def draw_para(c: canvas.Canvas, text: str, style: ParagraphStyle, x: float, y_top: float, width: float) -> float:
    para = Paragraph(text, style)
    _, height = para.wrap(width, PAGE_H)
    para.drawOn(c, x, y_top - height)
    return height


def round_rect(c: canvas.Canvas, x: float, y: float, w: float, h: float, fill, stroke=LINE, radius: float = 16):
    c.saveState()
    c.setLineWidth(0.8)
    if fill:
        c.setFillColor(fill)
    if stroke:
        c.setStrokeColor(stroke)
    c.roundRect(x, y, w, h, radius, stroke=1 if stroke else 0, fill=1 if fill else 0)
    c.restoreState()


def draw_chip(c: canvas.Canvas, x: float, y: float, label: str, bg, fg, border=None):
    text_w = c.stringWidth(label, "Helvetica-Bold", 7.6)
    w = text_w + 13
    h = 15
    round_rect(c, x, y, w, h, bg, border or bg, radius=7)
    c.setFont("Helvetica-Bold", 7.6)
    c.setFillColor(fg)
    c.drawString(x + 6.5, y + 4.1, label)
    return w


def draw_image(c: canvas.Canvas, path: Path, x: float, y: float, w: float, h: float):
    reader = ImageReader(str(path))
    iw, ih = reader.getSize()
    scale = min(w / iw, h / ih)
    dw = iw * scale
    dh = ih * scale
    dx = x + (w - dw) / 2
    dy = y + (h - dh) / 2
    c.drawImage(reader, dx, dy, width=dw, height=dh, mask="auto")


def draw_header_band(c: canvas.Canvas):
    c.saveState()
    c.setFillColor(SURFACE)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    c.setFillColor(NAVY)
    c.rect(0, PAGE_H - 178, PAGE_W, 178, stroke=0, fill=1)
    c.setFillColor(colors.HexColor("#1e3a8a"))
    c.circle(PAGE_W - 55, PAGE_H - 32, 82, stroke=0, fill=1)
    c.setFillColor(colors.HexColor("#0b4dbb"))
    c.circle(PAGE_W - 140, PAGE_H - 118, 44, stroke=0, fill=1)
    c.setFillColor(colors.HexColor("#155e75"))
    c.circle(MARGIN + 22, PAGE_H - 72, 18, stroke=0, fill=1)
    c.restoreState()


def draw_footer(c: canvas.Canvas, page_no: int):
    c.setStrokeColor(LINE)
    c.line(MARGIN, 0.44 * inch, PAGE_W - MARGIN, 0.44 * inch)
    draw_para(
        c,
        "Shreyas Sachin Kulkarni  |  AI Systems Engineer Portfolio",
        STYLES["footer"],
        MARGIN,
        0.35 * inch,
        240,
    )
    draw_para(c, f"Page {page_no}", STYLES["right_footer"], PAGE_W - MARGIN - 60, 0.35 * inch, 60)


def page_one(c: canvas.Canvas):
    draw_header_band(c)

    x = MARGIN
    top = PAGE_H - 34
    draw_para(c, "Shreyas Sachin Kulkarni", STYLES["hero_name"], x, top, 320)
    draw_para(c, "AI Systems Engineer | RAG, Multi-Agent Workflows, Data Platforms", STYLES["hero_sub"], x, top - 32, 340)
    draw_para(
        c,
        "(217) 866-6174  |  <u>ssk16@illinois.edu</u>  |  linkedin.com/in/shreyaskulkarni29  |  portfolio-shreyas-kulkarni.netlify.app",
        STYLES["body_light"],
        x,
        top - 50,
        430,
    )

    summary_x = MARGIN
    summary_y = PAGE_H - 214
    summary_w = 326
    summary_h = 168
    round_rect(c, summary_x, summary_y - summary_h, summary_w, summary_h, CARD, stroke=LINE)
    draw_para(c, "Why I Build AI Systems", STYLES["card_title"], summary_x + 18, summary_y - 18, 220)
    draw_para(
        c,
        "I build AI systems that have to work outside notebooks: agentic retrieval stacks, evaluators for SWE agents, cloud-native data platforms, and developer tooling with Docker-backed isolation. My strongest work lives where language models, runtime evidence, and production constraints meet.",
        STYLES["body"],
        summary_x + 18,
        summary_y - 42,
        summary_w - 36,
    )
    draw_para(
        c,
        "I use AI-assisted coding tools such as Codex and Claude Code as force multipliers, while staying hands-on in architecture, implementation, debugging, and evaluation.",
        STYLES["body_small"],
        summary_x + 18,
        summary_y - 110,
        summary_w - 36,
    )

    metrics_x = summary_x + summary_w + 16
    metrics_y = summary_y
    metric_w = 108
    metric_h = 72
    metric_data = [
        ("95%", "retrieval accuracy on agentic RAG"),
        ("50%", "MRR lift from chunking and ranking tests"),
        ("470K+", "records processed in PySpark analytics pipelines"),
        ("25K/min", "CDC throughput in containerized banking data pipeline"),
    ]
    for idx, (value, label) in enumerate(metric_data):
        col = idx % 2
        row = idx // 2
        card_x = metrics_x + col * (metric_w + 10)
        card_y = metrics_y - row * (metric_h + 10) - metric_h
        fill = SOFT_BLUE if idx in (0, 3) else SOFT_GREEN
        if idx == 1:
            fill = SOFT_AMBER
        if idx == 2:
            fill = SOFT_ROSE
        round_rect(c, card_x, card_y, metric_w, metric_h, fill, stroke=None, radius=14)
        draw_para(c, value, STYLES["metric"], card_x + 8, card_y + metric_h - 20, metric_w - 16)
        draw_para(c, label, STYLES["metric_label"], card_x + 8, card_y + metric_h - 41, metric_w - 16)

    section_top = 440
    draw_para(c, "What I Build", STYLES["section"], MARGIN, section_top, 200)

    cards = [
        (
            "AI Systems",
            "Agentic RAG, LangGraph orchestration, prompt design, vector search, embedding evaluation, and LLM-driven product features that need measurable behavior.",
            SOFT_BLUE,
        ),
        (
            "Data Platforms",
            "PySpark pipelines, lakehouse patterns, Databricks, Snowflake, Kafka, Airflow, and cloud-native data services across AWS, Azure, and GCP.",
            SOFT_GREEN,
        ),
        (
            "Developer Tooling",
            "Preflight merge validation, Docker sandboxes, eval harnesses, runtime evidence collection, and reproducible testing for AI-assisted engineering workflows.",
            SOFT_AMBER,
        ),
    ]
    gap = 12
    card_w = (CONTENT_W - (2 * gap)) / 3
    card_y = 286
    for idx, (title, body, fill) in enumerate(cards):
        cx = MARGIN + idx * (card_w + gap)
        round_rect(c, cx, card_y, card_w, 116, fill, stroke=None, radius=16)
        draw_para(c, title, STYLES["card_title"], cx + 14, card_y + 95, card_w - 28)
        draw_para(c, body, STYLES["body_small"], cx + 14, card_y + 76, card_w - 28)

    stack_y = 238
    draw_para(c, "Selected Stack", STYLES["small_caps"], MARGIN, stack_y, 120)
    chips = [
        "Python", "SQL", "LangGraph", "LangChain", "OpenAI API", "AWS Bedrock", "Vertex AI",
        "Docker", "Kubernetes", "PySpark", "Databricks", "Snowflake", "Kafka", "Airflow",
        "dbt", "MLflow", "PowerBI", "Tableau",
    ]
    chip_x = MARGIN
    chip_y = 202
    row_gap = 22
    for label in chips:
        chip_w = c.stringWidth(label, "Helvetica-Bold", 7.6) + 13
        if chip_x + chip_w > PAGE_W - MARGIN:
            chip_x = MARGIN
            chip_y -= row_gap
        draw_chip(c, chip_x, chip_y, label, CARD, SLATE, border=LINE)
        chip_x += chip_w + 7

    north_star_y = 92
    round_rect(c, MARGIN, north_star_y, CONTENT_W, 82, CARD, stroke=LINE, radius=18)
    draw_para(c, "Current North Star", STYLES["card_title"], MARGIN + 18, north_star_y + 62, 180)
    draw_para(
        c,
        "Design AI workflows that are trustworthy under budget pressure: systems that can retrieve, reason, validate, and stop themselves when the evidence says a path is weak.",
        STYLES["body"],
        MARGIN + 18,
        north_star_y + 41,
        CONTENT_W - 36,
    )

    draw_footer(c, 1)


def page_two(c: canvas.Canvas):
    c.setFillColor(SURFACE)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    draw_para(c, "Experience Snapshot", STYLES["section"], MARGIN, PAGE_H - MARGIN, 240)
    draw_para(
        c,
        "Graduate training at UIUC, production AI engineering in industry, and independent systems work focused on evaluation, orchestration, and reliable execution.",
        STYLES["body"],
        MARGIN,
        PAGE_H - MARGIN - 28,
        430,
    )

    exp_cards = [
        (
            508,
            128,
            "AI Engineering Intern  |  Data Science Research Services, UIUC",
            "Jul 2025 - Present",
            [
                "Architected agentic RAG with LangGraph decision trees and Qwen3-32B, reaching 95% retrieval accuracy.",
                "Improved retrieval quality by 50% through A/B tests on chunking, hybrid search, and custom scoring.",
                "Built async ETL and ingestion pipelines across Azure, AWS Bedrock, MongoDB, and PostgreSQL vector stores.",
                "Created operational dashboards over 8,700+ events to translate system behavior into decisions.",
            ],
            SOFT_BLUE,
        ),
        (
            360,
            128,
            "Associate Data Scientist  |  Apptware Pvt. Ltd.",
            "Apr 2023 - Jun 2024",
            [
                "Built PySpark and SQL pipelines over 470,000+ records and delivered decision-ready PowerBI dashboards.",
                "Optimized low-latency inference pipelines on AWS Lambda, cutting STT latency by 80% for IVR workloads.",
                "Developed Pix2Pix and YOLO pipelines across healthcare and edge-device use cases.",
                "Deployed always-on data extraction and analytics services on AWS for 20+ enterprise clients.",
            ],
            SOFT_GREEN,
        ),
        (
            238,
            102,
            "Data Science Intern  |  Apptware Pvt. Ltd.",
            "Sep 2022 - Apr 2023",
            [
                "Built GPT-4 plus SQL tool-calling workflows with Chainlit and LangChain.",
                "Fine-tuned Falcon-7B and LLaMA with LoRA and QLoRA for applied NLP systems.",
                "Used OCR, topic models, and few-shot classification to structure unstructured enterprise documents.",
            ],
            SOFT_AMBER,
        ),
    ]
    for y, h, title, dates, bullets, fill in exp_cards:
        round_rect(c, MARGIN, y, CONTENT_W, h, CARD, stroke=LINE, radius=18)
        round_rect(c, MARGIN + 12, y + h - 32, 120, 18, fill, stroke=None, radius=10)
        draw_para(c, dates, STYLES["body_small_muted"], MARGIN + 20, y + h - 18, 104)
        draw_para(c, title, STYLES["card_title"], MARGIN + 16, y + h - 40, CONTENT_W - 32)
        bullet_html = "<br/>".join([f"- {item}" for item in bullets])
        draw_para(c, bullet_html, STYLES["body_small"], MARGIN + 16, y + h - 62, CONTENT_W - 32)

    summary_y = 94
    gap = 12
    small_w = (CONTENT_W - (2 * gap)) / 3
    summary_cards = [
        (
            "Education",
            "M.S. Information Science, UIUC (3.96 GPA)<br/>B.E. Computer Engineering, SPPU (3.86 GPA)<br/><br/>Focus: distributed systems, AI design, and cloud architecture.",
            SOFT_ROSE,
        ),
        (
            "Current Focus",
            "Building AI systems that can <b>evaluate themselves under constraints</b>: runtime evidence, early stopping, trace quality, and budget-aware agent control.",
            SOFT_BLUE,
        ),
        (
            "Hands-On Engineering",
            "I use Codex and Claude Code to move faster, but I still own the architecture, implementation, evaluation setup, and systems tradeoffs directly.",
            SOFT_GREEN,
        ),
    ]
    for idx, (title, body, fill) in enumerate(summary_cards):
        x = MARGIN + idx * (small_w + gap)
        round_rect(c, x, summary_y, small_w, 126, CARD, stroke=LINE, radius=18)
        round_rect(c, x + 12, summary_y + 126 - 32, 96, 18, fill, stroke=None, radius=9)
        draw_para(c, title, STYLES["body_small_muted"], x + 18, summary_y + 126 - 18, 88)
        draw_para(c, body, STYLES["body_small_muted"], x + 14, summary_y + 126 - 44, small_w - 28)

    chip_y = 42
    chip_x = MARGIN
    caps = [
        "RAG eval", "Docker", "AWS/GCP/Azure", "Vector DBs",
        "PySpark", "Agentic systems", "A/B testing", "Kubernetes",
    ]
    for label in caps:
        chip_w = c.stringWidth(label, "Helvetica-Bold", 7.6) + 13
        if chip_x + chip_w > PAGE_W - MARGIN:
            chip_x = MARGIN
            chip_y -= 20
        draw_chip(c, chip_x, chip_y, label, NAVY, colors.white, border=None)
        chip_x += chip_w + 7

    draw_footer(c, 2)


def project_card_with_image(
    c: canvas.Canvas,
    x: float,
    y: float,
    w: float,
    h: float,
    title: str,
    kicker: str,
    bullets: list[str],
    image_path: Path,
    fill,
):
    round_rect(c, x, y, w, h, CARD, stroke=LINE, radius=20)
    round_rect(c, x + 16, y + h - 34, 124, 18, fill, stroke=None, radius=9)
    draw_para(c, kicker, STYLES["body_small_muted"], x + 22, y + h - 20, 116)
    draw_para(c, title, STYLES["section"], x + 16, y + h - 48, w - 32)
    img_y = y + 84
    img_h = h - 152
    round_rect(c, x + 16, img_y, w - 32, img_h, colors.white, stroke=LINE, radius=16)
    draw_image(c, image_path, x + 24, img_y + 8, w - 48, img_h - 16)
    bullet_html = "<br/>".join([f"- {b}" for b in bullets])
    draw_para(c, bullet_html, STYLES["body_small"], x + 16, y + 64, w - 32)


def text_project_card(c: canvas.Canvas, x: float, y: float, w: float, h: float, title: str, kicker: str, body: str, snippet: str, fill):
    round_rect(c, x, y, w, h, NAVY, stroke=None, radius=20)
    round_rect(c, x + 14, y + h - 34, 126, 18, fill, stroke=None, radius=9)
    draw_para(c, kicker, STYLES["body_small_muted"], x + 20, y + h - 20, 118)
    draw_para(c, title, STYLES["card_title_dark"], x + 16, y + h - 46, w - 32)
    draw_para(c, body, STYLES["body_light"], x + 16, y + h - 70, w - 32)
    round_rect(c, x + 16, y + 16, w - 32, 54, colors.HexColor("#162443"), stroke=colors.HexColor("#22365c"), radius=14)
    draw_para(c, snippet, STYLES["mono"], x + 24, y + 58, w - 48)


def page_three(c: canvas.Canvas):
    c.setFillColor(SURFACE)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    draw_para(c, "Featured Project Architectures", STYLES["section"], MARGIN, PAGE_H - MARGIN, 320)
    draw_para(
        c,
        "A selection of systems where I combined AI components, data infrastructure, and explicit control over how information moves through a workflow.",
        STYLES["body"],
        MARGIN,
        PAGE_H - MARGIN - 28,
        420,
    )

    project_card_with_image(
        c,
        MARGIN,
        338,
        CONTENT_W,
        354,
        "Multi-Agent Insurance Processing System",
        "Featured architecture",
        [
            "Designed a six-agent LangGraph workflow with OpenAI function calling and structured routing for insurance assistance.",
            "Separated supervisor logic, domain tools, RAG access, and observability to keep behavior auditable and reproducible.",
            "Used agent boundaries intentionally so the system could escalate, clarify, and constrain tool usage instead of hallucinating free-form behavior.",
        ],
        IMAGE_MULTI_AGENT,
        SOFT_BLUE,
    )

    project_card_with_image(
        c,
        MARGIN,
        48,
        CONTENT_W,
        272,
        "Containerized Banking Data Architecture",
        "High-throughput data platform",
        [
            "Built a CDC pipeline from PostgreSQL through Debezium, Kafka, MinIO/S3, Snowflake, dbt, and Airflow.",
            "Designed for continuous throughput of roughly 25,000 transactions and account updates per minute.",
            "Added Docker-based orchestration and GitHub Actions to keep local development and pipeline automation aligned.",
        ],
        IMAGE_BANKING,
        SOFT_GREEN,
    )

    draw_footer(c, 3)


def page_four(c: canvas.Canvas):
    c.setFillColor(SURFACE)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    draw_para(c, "Current Systems Work", STYLES["section"], MARGIN, PAGE_H - MARGIN, 240)
    draw_para(
        c,
        "The projects below reflect the direction I want to keep pushing: reliable AI systems, better evaluation signals, and developer tools that act on evidence instead of hype.",
        STYLES["body"],
        MARGIN,
        PAGE_H - MARGIN - 28,
        420,
    )

    project_card_with_image(
        c,
        MARGIN,
        334,
        CONTENT_W,
        358,
        "Automated Insurance Claim Audit Pipeline",
        "Azure + lakehouse + CV",
        [
            "Built an end-to-end Azure Databricks pipeline using Bronze -> Silver -> Gold layers under a constrained 4GB cluster budget.",
            "Used PySpark, Hive Metastore, MLflow, and an Xception-based CV model that reached 94% accuracy.",
            "Translated multimodal insurance inputs into business-ready decisions with explicit rule handling and model monitoring hooks.",
        ],
        IMAGE_AZURE,
        SOFT_AMBER,
    )

    half_gap = 14
    half_w = (CONTENT_W - half_gap) / 2
    bottom_y = 48

    text_project_card(
        c,
        MARGIN,
        bottom_y,
        half_w,
        250,
        "Preflight",
        "Solo developer | Docker-backed validation",
        "Building a CLI-first merge validation system that provisions isolated sandboxes, deploys candidate code changes, runs targeted checks, collects runtime evidence, and emits structured merge recommendations. The goal is to block unsafe merges with localizable, evidence-backed findings rather than static-only guesswork.",
        "preflight run --sandbox-backend docker<br/>--enable-load-probe --enable-failure-injection",
        colors.HexColor("#163861"),
    )

    text_project_card(
        c,
        MARGIN + half_w + half_gap,
        bottom_y,
        half_w,
        250,
        "TracePop / SWE-Agent Evaluation",
        "Research implementation | official harness aware",
        "Working on early termination policies for SWE-agent trajectories under bounded test-time budgets. Exploring cheap read-only prefixes, early-signal tests, LLM-as-judge signals, and non-LLM models using trajectory features such as file exploration breadth, reasoning depth, no-progress patterns, and ideation behavior.",
        "Stage I: prefix culling -> stable pool -> revision -> trace compression",
        colors.HexColor("#1f2947"),
    )

    draw_footer(c, 4)


def build_pdf():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUTPUT), pagesize=letter)
    c.setTitle("Shreyas Kulkarni Portfolio")
    c.setAuthor("Shreyas Sachin Kulkarni")
    c.setSubject("AI systems engineering portfolio")

    page_one(c)
    c.showPage()
    page_two(c)
    c.showPage()
    page_three(c)
    c.showPage()
    page_four(c)
    c.save()


if __name__ == "__main__":
    build_pdf()
    print(OUTPUT)
