# 🧠 AI Diagram Quizzer

An automated study tool that transforms visual diagrams into interactive multiple-choice quizzes using local Vision-AI (Qwen2.5-VL).



## 🚀 The Mission
This app is designed to bridge the gap between static study materials and active recall. By leveraging a local NVIDIA-powered server, it "reads" diagrams, generates challenging questions, and provides instant AI-driven feedback—all without data leaving your local network.

## ✨ Core Features
- **Automated Question Generation**: Analyzes images in real-time to create context-aware questions and explanations.
- **Local Vision-AI**: Powered by **Qwen2.5-VL 7B** running via Ollama for high-speed, private processing.
- **Dynamic Question Banks**: Automatically detects and categorizes subfolders within the test library.
- **Interactive Review**: Features high-fidelity image zooming and instant performance statistics.

## 📁 How It Works: Folder-Based Categories
The application uses the directory structure of the `TestQuestions` folder to build its user interface. 

**To add a new subject:**
Create a subfolder inside `src/TestQuestions/`. The app will automatically find it and add it to the "Select Bank" dropdown.

```text
src/TestQuestions/
├── Chem/               <-- Appears as "Chem Questions"
│   └── catalyst.jpg
├── Physics/            <-- Appears as "Physics Questions"
│   └── circuit.png
└── Cell_Bio/           <-- Appears as "Cell Bio Questions"
    └── mitosis.jpg

## ⚙️ Configuration & AI Backend

This application is optimized for local-first AI processing to ensure low latency and data privacy. It connects to a dedicated inference server within your local network.

### 🤖 AI Model Details
- **Provider:** Ollama
- **Vision Model:** `qwen2.5vl:7b` (Optimized for visual document and diagram understanding)
- **Keep-Alive:** Configured for `-1` in Docker to keep the model resident in GPU memory for instant response times.

### 🌐 Network Settings
The app is currently hardcoded to communicate with the following endpoint:
- **Ollama Host:** `http://192.168.1.230:11434`

### 📁 Folder-to-Bank Logic
The application automatically parses the `src/TestQuestions` directory to create subject banks.
- **Requirement:** Images must be placed in a subfolder (e.g., `/TestQuestions/Chem/`) to appear in the application dropdown.
- **Supported Formats:** `.jpg`, `.jpeg`, and `.png`.
