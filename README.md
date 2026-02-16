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
