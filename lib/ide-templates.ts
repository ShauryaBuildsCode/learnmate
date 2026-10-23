import type { Files, Language } from "@/lib/schemas/exercise";

export const LANGUAGE_LABELS: Record<Language, string> = {
  python: "Python",
  javascript: "JavaScript",
  html: "HTML / CSS / JS",
  react: "React",
  c: "C",
  cpp: "C++",
  java: "Java",
  go: "Go",
  rust: "Rust",
};

/** Starter programs used when the student switches language manually. */
export const TEMPLATES: Record<Language, Files> = {
  python: { "main.py": 'for i in range(3):\n    print("Hello from Python", i)\n' },
  javascript: {
    "main.js": 'for (let i = 0; i < 3; i++) {\n  console.log("Hello from JavaScript", i);\n}\n',
  },
  html: {
    "index.html":
      '<!doctype html>\n<html>\n  <head>\n    <link rel="stylesheet" href="style.css" />\n  </head>\n  <body>\n    <h1 id="title">Hello LearnMate</h1>\n    <button id="btn">Click me</button>\n    <script src="script.js"></script>\n  </body>\n</html>\n',
    "style.css": "body { font-family: system-ui; padding: 24px; }\nh1 { color: #4f46e5; }\n",
    "script.js":
      'document.getElementById("btn").addEventListener("click", () => {\n  document.getElementById("title").textContent = "Clicked!";\n  console.log("button clicked");\n});\n',
  },
  react: {
    "App.js":
      'import { useState } from "react";\n\nexport default function App() {\n  const [count, setCount] = useState(0);\n  return (\n    <div style={{ padding: 24, fontFamily: "system-ui" }}>\n      <h1>Count: {count}</h1>\n      <button onClick={() => setCount(count + 1)}>Add one</button>\n    </div>\n  );\n}\n',
  },
  c: {
    "main.c":
      '#include <stdio.h>\n\nint main(void) {\n    for (int i = 0; i < 3; i++) {\n        printf("Hello from C %d\\n", i);\n    }\n    return 0;\n}\n',
  },
  cpp: {
    "main.cpp":
      '#include <iostream>\n\nint main() {\n    for (int i = 0; i < 3; i++) {\n        std::cout << "Hello from C++ " << i << std::endl;\n    }\n    return 0;\n}\n',
  },
  java: {
    "Main.java":
      'public class Main {\n    public static void main(String[] args) {\n        for (int i = 0; i < 3; i++) {\n            System.out.println("Hello from Java " + i);\n        }\n    }\n}\n',
  },
  go: {
    "main.go":
      'package main\n\nimport "fmt"\n\nfunc main() {\n\tfor i := 0; i < 3; i++ {\n\t\tfmt.Println("Hello from Go", i)\n\t}\n}\n',
  },
  rust: {
    "main.rs":
      'fn main() {\n    for i in 0..3 {\n        println!("Hello from Rust {}", i);\n    }\n}\n',
  },
};
