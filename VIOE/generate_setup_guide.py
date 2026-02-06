"""
VIOE System Setup Guide - PDF Generator
Generates a professional setup guide for macOS and Windows
"""

from fpdf import FPDF
import os
from datetime import datetime


class SetupGuidePDF(FPDF):
    """Custom PDF class with headers, footers, and styling helpers."""

    def __init__(self):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.set_auto_page_break(auto=True, margin=25)
        # Color palette
        self.PRIMARY = (0, 102, 153)       # Deep teal
        self.SECONDARY = (51, 51, 51)      # Dark gray
        self.ACCENT = (0, 150, 199)        # Bright cyan
        self.LIGHT_BG = (240, 245, 250)    # Light blue-gray
        self.TIP_BG = (232, 245, 233)      # Light green
        self.TIP_BORDER = (76, 175, 80)    # Green
        self.WARN_BG = (255, 243, 224)     # Light orange
        self.WARN_BORDER = (255, 152, 0)   # Orange
        self.NOTE_BG = (227, 242, 253)     # Light blue
        self.NOTE_BORDER = (33, 150, 243)  # Blue
        self.ERROR_BG = (255, 235, 238)    # Light red
        self.ERROR_BORDER = (244, 67, 54)  # Red
        self.is_cover = False

    def header(self):
        if self.is_cover or self.page_no() == 1:
            return
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(*self.PRIMARY)
        self.cell(0, 8, "VIOE - System Setup Guide", align="L")
        self.set_font("Helvetica", "", 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 8, f"Page {self.page_no()}", align="R", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(*self.PRIMARY)
        self.set_line_width(0.3)
        self.line(10, 18, 200, 18)
        self.ln(5)

    def footer(self):
        if self.is_cover:
            return
        self.set_y(-20)
        self.set_draw_color(200, 200, 200)
        self.set_line_width(0.2)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(3)
        self.set_font("Helvetica", "", 7)
        self.set_text_color(150, 150, 150)
        self.cell(0, 5, "VIOE - Vulnerability Intelligence & Ownership Engine  |  Confidential", align="C")

    # ── Styling helpers ───────────────────────────────────────────

    def section_title(self, number, title):
        """Major section heading with numbering."""
        self.ln(4)
        self.set_font("Helvetica", "B", 18)
        self.set_text_color(*self.PRIMARY)
        self.cell(0, 12, f"{number}.  {title}", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(*self.ACCENT)
        self.set_line_width(0.8)
        self.line(10, self.get_y() + 1, 80, self.get_y() + 1)
        self.ln(6)

    def sub_heading(self, text):
        """Sub-section heading."""
        self.ln(2)
        self.set_font("Helvetica", "B", 13)
        self.set_text_color(*self.SECONDARY)
        self.cell(0, 9, text, new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def sub_sub_heading(self, text):
        """Third-level heading."""
        self.ln(1)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(80, 80, 80)
        self.cell(0, 7, text, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def body_text(self, text):
        """Standard paragraph text."""
        self.set_font("Helvetica", "", 10)
        self.set_text_color(60, 60, 60)
        self.multi_cell(0, 5.5, text)
        self.ln(2)

    def bullet(self, text, indent=15):
        """Bullet point item."""
        x = self.get_x()
        self.set_font("Helvetica", "", 10)
        self.set_text_color(60, 60, 60)
        self.set_x(indent)
        self.cell(5, 5.5, "-")
        self.multi_cell(0, 5.5, f"  {text}")
        self.ln(1)

    def numbered_step(self, number, text):
        """Numbered step with bold number."""
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(*self.PRIMARY)
        self.cell(10, 6, f"{number}.")
        self.set_font("Helvetica", "", 10)
        self.set_text_color(60, 60, 60)
        self.multi_cell(0, 6, text)
        self.ln(1.5)

    def code_block(self, text):
        """Monospace code block with gray background."""
        self.ln(1)
        self.set_fill_color(245, 245, 245)
        self.set_draw_color(200, 200, 200)
        y_start = self.get_y()
        self.set_font("Courier", "", 9)
        self.set_text_color(40, 40, 40)
        lines = text.strip().split("\n")
        block_h = len(lines) * 5.5 + 6
        if self.get_y() + block_h > 270:
            self.add_page()
            y_start = self.get_y()
        self.rect(12, y_start, 186, block_h, style="DF")
        self.set_xy(16, y_start + 3)
        for i, line in enumerate(lines):
            self.set_x(16)
            self.cell(0, 5.5, line, new_x="LMARGIN", new_y="NEXT")
        self.ln(4)

    def callout_box(self, box_type, title, text):
        """Callout box: tip, warning, note, or error."""
        colors = {
            "tip":     (self.TIP_BG, self.TIP_BORDER, "TIP"),
            "warning": (self.WARN_BG, self.WARN_BORDER, "WARNING"),
            "note":    (self.NOTE_BG, self.NOTE_BORDER, "NOTE"),
            "error":   (self.ERROR_BG, self.ERROR_BORDER, "ERROR"),
        }
        bg, border, label = colors.get(box_type, colors["note"])

        self.ln(2)
        y_start = self.get_y()
        # Estimate height
        self.set_font("Helvetica", "", 9)
        line_count = max(1, len(text) // 75 + text.count("\n") + 1)
        box_h = 8 + line_count * 5 + 6
        if y_start + box_h > 270:
            self.add_page()
            y_start = self.get_y()

        # Draw box
        self.set_fill_color(*bg)
        self.rect(12, y_start, 186, box_h, style="F")
        self.set_draw_color(*border)
        self.set_line_width(0.8)
        self.line(12, y_start, 12, y_start + box_h)

        # Title
        self.set_xy(17, y_start + 2)
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(*border)
        self.cell(0, 5, f"{label}: {title}", new_x="LMARGIN", new_y="NEXT")

        # Body
        self.set_x(17)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(60, 60, 60)
        self.multi_cell(175, 5, text)
        self.set_y(y_start + box_h + 3)

    def checklist_item(self, text):
        """Checklist item with empty checkbox."""
        self.set_font("Helvetica", "", 10)
        self.set_text_color(60, 60, 60)
        self.set_draw_color(150, 150, 150)
        x = self.get_x() + 15
        y = self.get_y()
        self.rect(x, y + 0.5, 4, 4)
        self.set_xy(x + 7, y)
        self.cell(0, 5.5, text, new_x="LMARGIN", new_y="NEXT")
        self.ln(1.5)


def build_pdf():
    pdf = SetupGuidePDF()

    # ══════════════════════════════════════════════════════════════
    #  COVER PAGE
    # ══════════════════════════════════════════════════════════════
    pdf.is_cover = True
    pdf.add_page()

    # Background accent bar
    pdf.set_fill_color(*pdf.PRIMARY)
    pdf.rect(0, 0, 210, 100, style="F")

    # Title
    pdf.set_y(30)
    pdf.set_font("Helvetica", "B", 32)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 14, "System Setup Guide", align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 14)
    pdf.set_text_color(200, 230, 240)
    pdf.cell(0, 10, "macOS & Windows", align="C", new_x="LMARGIN", new_y="NEXT")

    # Divider
    pdf.ln(8)
    pdf.set_draw_color(255, 255, 255)
    pdf.set_line_width(0.5)
    pdf.line(70, pdf.get_y(), 140, pdf.get_y())
    pdf.ln(8)

    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(220, 240, 250)
    pdf.cell(0, 7, "A complete guide for installing, configuring, and verifying", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, "the VIOE development environment on your workstation.", align="C", new_x="LMARGIN", new_y="NEXT")

    # Product name block
    pdf.set_y(120)
    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(*pdf.PRIMARY)
    pdf.cell(0, 12, "VIOE", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 7, "Vulnerability Intelligence & Ownership Engine", align="C", new_x="LMARGIN", new_y="NEXT")

    # Metadata table
    pdf.set_y(170)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(100, 100, 100)
    meta = [
        ("Document Version", "1.0"),
        ("Date", datetime.now().strftime("%B %d, %Y")),
        ("Classification", "Internal - Team Distribution"),
        ("Platform Coverage", "macOS / Windows 10 & 11"),
    ]
    for label, value in meta:
        pdf.set_x(50)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(80, 80, 80)
        pdf.cell(45, 7, label)
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(100, 100, 100)
        pdf.cell(0, 7, value, new_x="LMARGIN", new_y="NEXT")

    # Footer on cover
    pdf.set_y(260)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(170, 170, 170)
    pdf.cell(0, 5, "VIOE - Vulnerability Intelligence & Ownership Engine  |  Confidential", align="C")

    pdf.is_cover = False

    # ══════════════════════════════════════════════════════════════
    #  TABLE OF CONTENTS
    # ══════════════════════════════════════════════════════════════
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_text_color(*pdf.PRIMARY)
    pdf.cell(0, 12, "Table of Contents", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)
    pdf.set_draw_color(*pdf.ACCENT)
    pdf.set_line_width(0.5)
    pdf.line(10, pdf.get_y(), 60, pdf.get_y())
    pdf.ln(8)

    toc = [
        ("1", "Introduction", "3"),
        ("2", "System Requirements", "4"),
        ("3", "macOS Setup Guide", "5"),
        ("", "3.1  Install Node.js", "5"),
        ("", "3.2  Install Git", "6"),
        ("", "3.3  Install a Code Editor", "6"),
        ("", "3.4  Clone and Configure the Project", "7"),
        ("", "3.5  Verify Installation", "8"),
        ("", "3.6  Common macOS Issues", "8"),
        ("4", "Windows Setup Guide", "9"),
        ("", "4.1  Install Node.js", "9"),
        ("", "4.2  Install Git", "10"),
        ("", "4.3  Install a Code Editor", "10"),
        ("", "4.4  Clone and Configure the Project", "11"),
        ("", "4.5  Verify Installation", "12"),
        ("", "4.6  Common Windows Issues", "12"),
        ("5", "Post-Setup Checklist", "13"),
        ("6", "Troubleshooting & Support", "14"),
        ("7", "Conclusion", "15"),
    ]
    for num, title, page in toc:
        if num and num[0].isdigit() and "." not in num:
            pdf.set_font("Helvetica", "B", 11)
            pdf.set_text_color(*pdf.SECONDARY)
            indent = 15
        else:
            pdf.set_font("Helvetica", "", 10)
            pdf.set_text_color(100, 100, 100)
            indent = 25
        pdf.set_x(indent)
        label = f"{num}   {title}" if num else f"     {title}"
        pdf.cell(150 - indent, 7, label)
        pdf.cell(0, 7, page, align="R", new_x="LMARGIN", new_y="NEXT")

    # ══════════════════════════════════════════════════════════════
    #  1. INTRODUCTION
    # ══════════════════════════════════════════════════════════════
    pdf.add_page()
    pdf.section_title("1", "Introduction")

    pdf.sub_heading("What This Guide Is For")
    pdf.body_text(
        "This document provides step-by-step instructions for setting up the development "
        "environment required to run the VIOE (Vulnerability Intelligence & Ownership Engine) "
        "web application on your local workstation. It covers both macOS and Windows operating systems."
    )

    pdf.sub_heading("Who Should Use This Guide")
    pdf.bullet("New team members joining the VIOE project")
    pdf.bullet("Contractors or partners who need to run the application locally")
    pdf.bullet("QA engineers setting up testing environments")
    pdf.bullet("Anyone who needs to build or review the VIOE application")

    pdf.sub_heading("What You Will Achieve")
    pdf.body_text("After completing this guide, you will have:")
    pdf.bullet("Node.js and npm installed and configured")
    pdf.bullet("Git version control installed and configured")
    pdf.bullet("A code editor ready for development")
    pdf.bullet("The VIOE project cloned, configured, and running locally")
    pdf.bullet("Verified that the application builds and runs correctly")

    pdf.callout_box("note", "Time to Complete",
                    "Setting up the full environment typically requires completing all steps in order. "
                    "If you already have some tools installed, you can skip those sections after verifying "
                    "the correct versions.")

    # ══════════════════════════════════════════════════════════════
    #  2. SYSTEM REQUIREMENTS
    # ══════════════════════════════════════════════════════════════
    pdf.add_page()
    pdf.section_title("2", "System Requirements")

    pdf.sub_heading("Operating System Versions")
    pdf.body_text("The following minimum OS versions are supported:")
    pdf.bullet("macOS: macOS 12 Monterey or later (macOS 13 Ventura or 14 Sonoma recommended)")
    pdf.bullet("Windows: Windows 10 version 1903 or later (Windows 11 recommended)")

    pdf.sub_heading("Hardware Requirements")
    pdf.bullet("Processor: 64-bit CPU (Intel or Apple Silicon for Mac; Intel or AMD for Windows)")
    pdf.bullet("RAM: 8 GB minimum (16 GB recommended for smooth development)")
    pdf.bullet("Disk Space: At least 2 GB free for tools and project files")
    pdf.bullet("Display: 1280x720 minimum resolution")

    pdf.sub_heading("Internet Requirements")
    pdf.bullet("Stable broadband connection for downloading tools and npm packages")
    pdf.bullet("Access to https://nodejs.org, https://git-scm.com, and https://npmjs.com")
    pdf.bullet("If behind a corporate proxy, have proxy settings ready (host, port, credentials)")

    pdf.sub_heading("Required Software Overview")
    pdf.body_text("The following tools must be installed. Each is covered in detail in the platform-specific sections:")

    # Software table
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(*pdf.LIGHT_BG)
    pdf.set_text_color(*pdf.PRIMARY)
    pdf.cell(45, 8, "  Tool", fill=True, border=1)
    pdf.cell(35, 8, "  Version", fill=True, border=1)
    pdf.cell(110, 8, "  Purpose", fill=True, border=1, new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(60, 60, 60)
    rows = [
        ("Node.js", "v18.x or v20.x LTS", "JavaScript runtime for building and running the app"),
        ("npm", "v9+ (bundled w/ Node)", "Package manager for installing dependencies"),
        ("Git", "v2.30+", "Version control for cloning the project repository"),
        ("Code Editor", "Latest stable", "VS Code recommended; any modern editor works"),
        ("Web Browser", "Chrome / Edge / Firefox", "For testing and viewing the application"),
    ]
    for tool, ver, purpose in rows:
        pdf.cell(45, 7, f"  {tool}", border=1)
        pdf.cell(35, 7, f"  {ver}", border=1)
        pdf.cell(110, 7, f"  {purpose}", border=1, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.callout_box("warning", "Node.js Version",
                    "VIOE requires Node.js v18 or v20 LTS. Do not use odd-numbered versions (e.g., v19, v21) "
                    "as they are unstable releases and may cause build failures. You can check your version "
                    "with: node --version")

    # ══════════════════════════════════════════════════════════════
    #  3. macOS SETUP GUIDE
    # ══════════════════════════════════════════════════════════════
    pdf.add_page()
    pdf.section_title("3", "macOS Setup Guide")

    # 3.1 Node.js
    pdf.sub_heading("3.1  Install Node.js")
    pdf.body_text(
        "Node.js is the JavaScript runtime needed to install dependencies, run the development "
        "server, and build the VIOE application."
    )

    pdf.sub_sub_heading("Option A: Direct Download (Recommended for Beginners)")
    pdf.numbered_step(1, "Open your web browser and navigate to  https://nodejs.org")
    pdf.numbered_step(2, 'Click the LTS (Long Term Support) download button labeled "Recommended For Most Users."')
    pdf.numbered_step(3, "Open the downloaded .pkg file and follow the installer prompts.")
    pdf.numbered_step(4, "Click Continue through each step, accept the license agreement, and click Install.")
    pdf.numbered_step(5, "Enter your Mac password when prompted and wait for installation to complete.")
    pdf.numbered_step(6, "Open Terminal (Applications > Utilities > Terminal) and verify:")

    pdf.code_block("node --version\nnpm --version")

    pdf.body_text("You should see version numbers like v20.x.x and 10.x.x respectively.")

    pdf.sub_sub_heading("Option B: Using Homebrew (For Advanced Users)")
    pdf.body_text("If you have Homebrew installed, you can install Node.js via the terminal:")
    pdf.code_block("brew install node@20\nbrew link node@20")

    pdf.callout_box("tip", "Multiple Node Versions",
                    "If you work on multiple projects with different Node.js versions, consider installing "
                    "nvm (Node Version Manager). Install it with:\n"
                    "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash\n"
                    "Then use: nvm install 20 && nvm use 20")

    # 3.2 Git
    pdf.sub_heading("3.2  Install Git")
    pdf.body_text("Git is required to clone the VIOE project repository.")

    pdf.numbered_step(1, 'Open Terminal and type  git --version  to check if Git is already installed.')
    pdf.numbered_step(2, "If not installed, macOS will prompt you to install the Xcode Command Line Tools. Click Install.")
    pdf.numbered_step(3, "Alternatively, download Git from  https://git-scm.com/download/mac")
    pdf.numbered_step(4, "After installation, configure your identity:")

    pdf.code_block('git config --global user.name "Your Name"\ngit config --global user.email "your.email@company.com"')

    pdf.numbered_step(5, "Verify installation:")
    pdf.code_block("git --version")

    # 3.3 Code Editor
    pdf.sub_heading("3.3  Install a Code Editor")
    pdf.body_text("We recommend Visual Studio Code (VS Code) for its excellent JavaScript/React support.")

    pdf.numbered_step(1, "Navigate to  https://code.visualstudio.com")
    pdf.numbered_step(2, "Download the macOS version (.dmg file).")
    pdf.numbered_step(3, "Open the .dmg file and drag VS Code to your Applications folder.")
    pdf.numbered_step(4, "Open VS Code, then open the Command Palette (Cmd+Shift+P) and type 'shell command' to install the 'code' command in PATH.")

    pdf.callout_box("tip", "Recommended VS Code Extensions",
                    "Install these extensions for the best VIOE development experience:\n"
                    "- ES7+ React/Redux/React-Native Snippets\n"
                    "- Tailwind CSS IntelliSense\n"
                    "- ESLint\n"
                    "- Prettier - Code Formatter")

    # 3.4 Clone & Configure
    pdf.add_page()
    pdf.sub_heading("3.4  Clone and Configure the Project")

    pdf.numbered_step(1, "Open Terminal and navigate to where you want to store the project:")
    pdf.code_block("cd ~/Projects\nmkdir -p ~/Projects && cd ~/Projects")

    pdf.numbered_step(2, "Clone the VIOE repository (or extract the ZIP archive):")
    pdf.code_block("# If using Git:\ngit clone <repository-url> vioe\ncd vioe\n\n# If using the ZIP archive:\nunzip VIOE_UAT.zip -d vioe\ncd vioe")

    pdf.numbered_step(3, "Create the environment configuration file:")
    pdf.code_block("cp .env.example .env")

    pdf.numbered_step(4, "The default .env is pre-configured for demo/mock mode. No changes are needed for local testing.")

    pdf.numbered_step(5, "Install project dependencies:")
    pdf.code_block("npm install")

    pdf.body_text("This will download all required packages. The process requires internet access and may download approximately 200 MB of packages.")

    pdf.numbered_step(6, "Start the development server:")
    pdf.code_block("npm run dev")

    pdf.numbered_step(7, "Open your web browser and navigate to the URL shown in the terminal (typically http://localhost:5173).")

    pdf.callout_box("note", "First Launch",
                    "The application starts in demo mode by default. On the login page, click any of the quick "
                    "login buttons (Admin, Manager, Analyst, Viewer) to explore the application with different "
                    "permission levels.")

    # 3.5 Verify
    pdf.sub_heading("3.5  Verify Installation")
    pdf.body_text("Run the following commands to confirm everything is set up correctly:")
    pdf.code_block("# Check tool versions\nnode --version        # Should show v18.x or v20.x\nnpm --version         # Should show v9+ or v10+\ngit --version         # Should show v2.30+\n\n# Run the test suite\nnpm run test:run      # All tests should pass\n\n# Build for production\nnpm run build         # Should complete without errors")

    # 3.6 Common macOS Issues
    pdf.sub_heading("3.6  Common macOS Issues")

    pdf.sub_sub_heading("Gatekeeper Blocks Installation")
    pdf.body_text(
        'If macOS shows "App can\'t be opened because it is from an unidentified developer," '
        "go to System Settings > Privacy & Security, scroll down, and click 'Open Anyway' next "
        "to the blocked application."
    )

    pdf.sub_sub_heading("Permission Denied Errors with npm")
    pdf.body_text(
        "If you see EACCES permission errors when running npm install globally, do NOT use sudo. "
        "Instead, reconfigure npm's default directory:"
    )
    pdf.code_block("mkdir ~/.npm-global\nnpm config set prefix '~/.npm-global'\n# Add to ~/.zshrc:\nexport PATH=~/.npm-global/bin:$PATH")

    pdf.sub_sub_heading("Port Already In Use")
    pdf.body_text(
        "If port 5173 is occupied, Vite will automatically try the next available port (5174, 5175, etc.). "
        "Check the terminal output for the actual URL."
    )

    pdf.callout_box("tip", "Apple Silicon Macs (M1/M2/M3)",
                    "Node.js v18+ has native Apple Silicon support. If you experience issues with older "
                    "packages, try running Terminal through Rosetta: Right-click Terminal > Get Info > "
                    "check 'Open using Rosetta.'")

    # ══════════════════════════════════════════════════════════════
    #  4. WINDOWS SETUP GUIDE
    # ══════════════════════════════════════════════════════════════
    pdf.add_page()
    pdf.section_title("4", "Windows Setup Guide")

    # 4.1 Node.js
    pdf.sub_heading("4.1  Install Node.js")
    pdf.body_text(
        "Node.js is the JavaScript runtime needed to install dependencies, run the development "
        "server, and build the VIOE application."
    )

    pdf.numbered_step(1, "Open your web browser and navigate to  https://nodejs.org")
    pdf.numbered_step(2, 'Click the LTS (Long Term Support) download button labeled "Recommended For Most Users."')
    pdf.numbered_step(3, "Run the downloaded .msi installer.")
    pdf.numbered_step(4, "Follow the setup wizard:")
    pdf.bullet("Accept the license agreement", indent=25)
    pdf.bullet("Keep the default installation path (C:\\Program Files\\nodejs\\)", indent=25)
    pdf.bullet('Ensure "Add to PATH" is checked (it is by default)', indent=25)
    pdf.bullet("On the Tools for Native Modules page, check the box to install build tools if offered", indent=25)
    pdf.numbered_step(5, "Click Install, then Finish when complete.")
    pdf.numbered_step(6, "Open a NEW Command Prompt or PowerShell window (existing ones won't have the updated PATH) and verify:")

    pdf.code_block("node --version\nnpm --version")

    pdf.body_text("You should see version numbers like v20.x.x and 10.x.x respectively.")

    pdf.callout_box("warning", "Important: Open a New Terminal",
                    "After installing Node.js, you MUST open a new Command Prompt, PowerShell, or "
                    "Windows Terminal window. Existing terminal windows will not recognize the 'node' "
                    "or 'npm' commands until you open a fresh one.")

    # 4.2 Git
    pdf.sub_heading("4.2  Install Git")
    pdf.body_text("Git is required to clone the VIOE project repository.")

    pdf.numbered_step(1, "Download Git for Windows from  https://git-scm.com/download/win")
    pdf.numbered_step(2, "Run the installer and follow the setup wizard:")
    pdf.bullet("Select Components: keep defaults, optionally add Windows Explorer integration", indent=25)
    pdf.bullet('Default Editor: choose your preferred editor (VS Code recommended, select "Use Visual Studio Code as Git\'s default editor")', indent=25)
    pdf.bullet("PATH Environment: select 'Git from the command line and also from 3rd-party software' (recommended)", indent=25)
    pdf.bullet("HTTPS Transport: select 'Use the OpenSSL library'", indent=25)
    pdf.bullet("Line Endings: select 'Checkout Windows-style, commit Unix-style line endings'", indent=25)
    pdf.bullet("All other options: keep defaults", indent=25)

    pdf.numbered_step(3, "After installation, configure your identity in a new terminal:")
    pdf.code_block('git config --global user.name "Your Name"\ngit config --global user.email "your.email@company.com"')

    pdf.numbered_step(4, "Verify installation:")
    pdf.code_block("git --version")

    # 4.3 Code Editor
    pdf.add_page()
    pdf.sub_heading("4.3  Install a Code Editor")
    pdf.body_text("We recommend Visual Studio Code (VS Code) for its excellent JavaScript/React support.")

    pdf.numbered_step(1, "Navigate to  https://code.visualstudio.com")
    pdf.numbered_step(2, "Download the Windows installer.")
    pdf.numbered_step(3, "Run the installer and follow the prompts:")
    pdf.bullet("Accept the license agreement", indent=25)
    pdf.bullet('Check "Add to PATH" (important for command-line use)', indent=25)
    pdf.bullet('Check "Register Code as an editor for supported file types"', indent=25)
    pdf.bullet('Check "Add Open with Code action to Windows Explorer"', indent=25)
    pdf.numbered_step(4, "Launch VS Code after installation completes.")

    pdf.callout_box("tip", "Recommended VS Code Extensions",
                    "Install these extensions for the best VIOE development experience:\n"
                    "- ES7+ React/Redux/React-Native Snippets\n"
                    "- Tailwind CSS IntelliSense\n"
                    "- ESLint\n"
                    "- Prettier - Code Formatter")

    # 4.4 Clone & Configure
    pdf.sub_heading("4.4  Clone and Configure the Project")

    pdf.numbered_step(1, "Open PowerShell or Command Prompt and navigate to your workspace:")
    pdf.code_block("cd C:\\Users\\YourName\\Projects\nmkdir Projects    # (if it doesn't exist)\ncd Projects")

    pdf.numbered_step(2, "Clone the VIOE repository (or extract the ZIP archive):")
    pdf.code_block("# If using Git:\ngit clone <repository-url> vioe\ncd vioe\n\n# If using the ZIP archive:\n# Extract VIOE_UAT.zip using Windows Explorer\n# or use PowerShell:\nExpand-Archive VIOE_UAT.zip -DestinationPath vioe\ncd vioe")

    pdf.numbered_step(3, "Create the environment configuration file:")
    pdf.code_block("copy .env.example .env")

    pdf.numbered_step(4, "The default .env is pre-configured for demo/mock mode. No changes are needed for local testing.")

    pdf.numbered_step(5, "Install project dependencies:")
    pdf.code_block("npm install")

    pdf.body_text("This will download all required packages. The process requires internet access and may download approximately 200 MB of packages.")

    pdf.numbered_step(6, "Start the development server:")
    pdf.code_block("npm run dev")

    pdf.numbered_step(7, "Open your web browser and navigate to the URL shown in the terminal (typically http://localhost:5173).")

    pdf.callout_box("note", "First Launch",
                    "The application starts in demo mode by default. On the login page, click any of the quick "
                    "login buttons (Admin, Manager, Analyst, Viewer) to explore the application with different "
                    "permission levels.")

    # 4.5 Verify
    pdf.add_page()
    pdf.sub_heading("4.5  Verify Installation")
    pdf.body_text("Run the following commands in PowerShell or Command Prompt to confirm everything is set up:")
    pdf.code_block("# Check tool versions\nnode --version        # Should show v18.x or v20.x\nnpm --version         # Should show v9+ or v10+\ngit --version         # Should show v2.30+\n\n# Run the test suite\nnpm run test:run      # All tests should pass\n\n# Build for production\nnpm run build         # Should complete without errors")

    # 4.6 Common Windows Issues
    pdf.sub_heading("4.6  Common Windows Issues")

    pdf.sub_sub_heading("'node' is not recognized as an internal or external command")
    pdf.body_text(
        "This means Node.js is not in your system PATH. Solutions:\n"
        "1. Close ALL terminal windows and open a new one.\n"
        "2. If it still doesn't work, re-run the Node.js installer and ensure 'Add to PATH' is checked.\n"
        "3. Manually add C:\\Program Files\\nodejs\\ to your system PATH via System Properties > Environment Variables."
    )

    pdf.sub_sub_heading("Windows Defender or Antivirus Blocking Installation")
    pdf.body_text(
        "Some antivirus software may flag npm package installations. If npm install hangs or fails:\n"
        "1. Temporarily add your project folder to the antivirus exclusion list.\n"
        "2. In Windows Security > Virus & Threat Protection > Manage Settings, add an exclusion "
        "for your project directory."
    )

    pdf.sub_sub_heading("Execution Policy Prevents Running Scripts")
    pdf.body_text("If PowerShell blocks npm scripts, run PowerShell as Administrator and execute:")
    pdf.code_block("Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser")

    pdf.sub_sub_heading("Long Path Issues")
    pdf.body_text(
        "node_modules folders can have deeply nested paths that exceed Windows' 260-character limit. "
        "Enable long path support by running PowerShell as Administrator:"
    )
    pdf.code_block("# Enable long paths in Windows\nNew-ItemProperty -Path \"HKLM:\\SYSTEM\\CurrentControlSet\\Control\\FileSystem\" `\n  -Name \"LongPathsEnabled\" -Value 1 -PropertyType DWORD -Force")

    pdf.callout_box("warning", "Administrator Rights",
                    "Some installation steps require Administrator privileges. Right-click the terminal "
                    "application and select 'Run as administrator' when needed. For day-to-day development, "
                    "regular user permissions are sufficient.")

    # ══════════════════════════════════════════════════════════════
    #  5. POST-SETUP CHECKLIST
    # ══════════════════════════════════════════════════════════════
    pdf.add_page()
    pdf.section_title("5", "Post-Setup Checklist")
    pdf.body_text(
        "Use this checklist to confirm that your environment is fully configured. "
        "Each item should be verified before you begin working with the VIOE application."
    )

    pdf.sub_heading("Tools & Versions")
    pdf.checklist_item("Node.js installed  -  node --version  shows v18.x or v20.x")
    pdf.checklist_item("npm installed  -  npm --version  shows v9+ or v10+")
    pdf.checklist_item("Git installed  -  git --version  shows v2.30+")
    pdf.checklist_item("Code editor installed (VS Code or equivalent)")
    pdf.checklist_item("Modern web browser available (Chrome, Edge, or Firefox)")

    pdf.sub_heading("Project Configuration")
    pdf.checklist_item("VIOE project cloned or extracted to local directory")
    pdf.checklist_item(".env file created from .env.example")
    pdf.checklist_item("npm install completed successfully (no errors)")

    pdf.sub_heading("Application Verification")
    pdf.checklist_item("npm run dev starts the server without errors")
    pdf.checklist_item("Application loads in browser at the displayed URL")
    pdf.checklist_item("Login page is accessible and demo login buttons work")
    pdf.checklist_item("Dashboard displays correctly after login")
    pdf.checklist_item("npm run test:run passes all tests")
    pdf.checklist_item("npm run build completes without errors")

    pdf.sub_heading("Optional But Recommended")
    pdf.checklist_item("VS Code extensions installed (ESLint, Tailwind CSS IntelliSense, Prettier)")
    pdf.checklist_item("Git identity configured (user.name and user.email)")
    pdf.checklist_item("Tested role switching: logged in as Admin, Manager, Analyst, and Viewer")

    pdf.callout_box("tip", "All Checks Passed?",
                    "If every item above is checked, your environment is fully set up. You are ready to "
                    "develop, test, and review the VIOE application. Refer to the project README for "
                    "additional development workflows.")

    # ══════════════════════════════════════════════════════════════
    #  6. TROUBLESHOOTING & SUPPORT
    # ══════════════════════════════════════════════════════════════
    pdf.add_page()
    pdf.section_title("6", "Troubleshooting & Support")

    pdf.sub_heading("Common Errors and Solutions")

    # Error table
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(*pdf.LIGHT_BG)
    pdf.set_text_color(*pdf.PRIMARY)
    col1 = 60
    col2 = 130
    pdf.cell(col1, 8, "  Error / Symptom", fill=True, border=1)
    pdf.cell(col2, 8, "  Solution", fill=True, border=1, new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(60, 60, 60)
    errors = [
        ("npm install fails with\nERESOLVE conflicts",
         "Run:  npm install --legacy-peer-deps\nThis resolves dependency version conflicts."),
        ("Port 5173 already in use",
         "Vite auto-selects the next port. Check terminal output for the actual URL.\nOr stop the other process using the port."),
        ("Blank page after login",
         "Clear browser cache (Ctrl+Shift+Delete), then hard refresh (Ctrl+Shift+R).\nCheck browser console for errors (F12 > Console tab)."),
        ("Build fails with\nout of memory",
         "Increase Node.js memory:  NODE_OPTIONS=--max-old-space-size=4096 npm run build"),
        ("npm ERR! code EACCES\n(macOS)",
         "Do NOT use sudo. Reconfigure npm global directory:\nmkdir ~/.npm-global && npm config set prefix '~/.npm-global'"),
        ("'node' not recognized\n(Windows)",
         "Open a NEW terminal window. If still failing, reinstall Node.js\nwith 'Add to PATH' checked."),
    ]
    for err, sol in errors:
        h = max(err.count("\n"), sol.count("\n")) * 5 + 10
        if pdf.get_y() + h > 265:
            pdf.add_page()
        y0 = pdf.get_y()
        pdf.multi_cell(col1, 5, f"  {err}", border="LTB", new_x="RIGHT", new_y="TOP", max_line_height=5)
        y1 = pdf.get_y()
        pdf.set_xy(10 + col1, y0)
        pdf.multi_cell(col2, 5, f"  {sol}", border="RTB", new_x="LMARGIN", new_y="NEXT", max_line_height=5)
        y2 = pdf.get_y()
        pdf.set_y(max(y1, y2))

    pdf.ln(4)

    pdf.sub_heading("Where to Get Help")
    pdf.bullet("Project Lead / Tech Lead: Reach out via your team's communication channel (Slack, Teams, email).")
    pdf.bullet("Internal Wiki: Check the project's Confluence or Notion documentation for additional guides.")
    pdf.bullet("Node.js Documentation: https://nodejs.org/en/docs/")
    pdf.bullet("Vite Documentation: https://vitejs.dev/guide/")
    pdf.bullet("React Documentation: https://react.dev/")

    pdf.callout_box("note", "Reporting Setup Issues",
                    "If you encounter an issue not covered in this guide, please report it to the project lead "
                    "with the following information:\n"
                    "1. Your operating system and version\n"
                    "2. Node.js version (node --version)\n"
                    "3. The exact error message or screenshot\n"
                    "4. The command that caused the error")

    # ══════════════════════════════════════════════════════════════
    #  7. CONCLUSION
    # ══════════════════════════════════════════════════════════════
    pdf.add_page()
    pdf.section_title("7", "Conclusion")

    pdf.body_text(
        "You have now completed the full setup of the VIOE development environment. Your workstation "
        "is configured to run, test, and build the application locally."
    )

    pdf.sub_heading("Best Practices")
    pdf.bullet("Keep Node.js updated to the latest LTS version for security and performance.")
    pdf.bullet("Run  npm install  whenever you pull new changes from the repository to ensure dependencies are current.")
    pdf.bullet("Use  npm run test:run  before committing changes to verify nothing is broken.")
    pdf.bullet("Use  npm run build  periodically to catch production build issues early.")
    pdf.bullet("Never commit the .env file to version control. Use .env.example for sharing configuration templates.")
    pdf.bullet("Keep your code editor extensions updated for the best development experience.")

    pdf.sub_heading("Application Quick Reference")

    # Quick reference table
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(*pdf.LIGHT_BG)
    pdf.set_text_color(*pdf.PRIMARY)
    pdf.cell(55, 8, "  Command", fill=True, border=1)
    pdf.cell(135, 8, "  Description", fill=True, border=1, new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Courier", "", 9)
    pdf.set_text_color(60, 60, 60)
    commands = [
        ("npm run dev", "Start the development server with hot reload"),
        ("npm run build", "Create a production-ready build in the /dist folder"),
        ("npm run preview", "Preview the production build locally"),
        ("npm run test", "Run tests in watch mode (re-runs on file changes)"),
        ("npm run test:run", "Run all tests once and exit"),
        ("npm run test:coverage", "Run tests with code coverage report"),
        ("npm run lint", "Check code for style and quality issues"),
    ]
    for cmd, desc in commands:
        pdf.set_font("Courier", "", 9)
        pdf.cell(55, 7, f"  {cmd}", border=1)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(135, 7, f"  {desc}", border=1, new_x="LMARGIN", new_y="NEXT")

    pdf.ln(6)

    pdf.sub_heading("Demo Login Accounts")
    pdf.body_text("In demo/mock mode, use these accounts to test different permission levels:")

    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(*pdf.LIGHT_BG)
    pdf.set_text_color(*pdf.PRIMARY)
    pdf.cell(40, 8, "  Role", fill=True, border=1)
    pdf.cell(55, 8, "  Email", fill=True, border=1)
    pdf.cell(30, 8, "  Password", fill=True, border=1)
    pdf.cell(65, 8, "  Access Level", fill=True, border=1, new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(60, 60, 60)
    accounts = [
        ("Admin", "admin@vioe.demo", "demo", "Full access to all features"),
        ("Manager", "manager@vioe.demo", "demo", "Team management, reports"),
        ("Analyst", "analyst@vioe.demo", "demo", "Triage, tasks, analysis"),
        ("Viewer", "viewer@vioe.demo", "demo", "Read-only access"),
    ]
    for role, email, pw, access in accounts:
        pdf.cell(40, 7, f"  {role}", border=1)
        pdf.cell(55, 7, f"  {email}", border=1)
        pdf.cell(30, 7, f"  {pw}", border=1)
        pdf.cell(65, 7, f"  {access}", border=1, new_x="LMARGIN", new_y="NEXT")

    pdf.ln(8)

    # Closing
    pdf.set_fill_color(*pdf.LIGHT_BG)
    y = pdf.get_y()
    pdf.rect(12, y, 186, 20, style="F")
    pdf.set_xy(17, y + 4)
    pdf.set_font("Helvetica", "I", 10)
    pdf.set_text_color(80, 80, 80)
    pdf.multi_cell(175, 6,
        "Thank you for completing this setup guide. If you have questions or suggestions "
        "for improving this document, please contact the project team."
    )

    # ── Save ──────────────────────────────────────────────────────
    output_path = r"D:\Codebase\VIOE\VIOE_UAT_System_Setup_Guide.pdf"
    pdf.output(output_path)
    print(f"PDF generated successfully: {output_path}")
    print(f"Total pages: {pdf.pages_count}")
    file_size = os.path.getsize(output_path)
    print(f"File size: {file_size / 1024:.1f} KB")


if __name__ == "__main__":
    build_pdf()
