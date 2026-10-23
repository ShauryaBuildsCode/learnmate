# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: demo.spec.ts >> demo path: quiz -> plan v1 -> lesson -> checkpoint -> IDE fail then pass -> plan v2 -> out-of-scope
- Location: e2e/demo.spec.ts:16:5

# Error details

```
Error: Channel closed
```

# Page snapshot

```yaml
- generic [ref=f1e1]:
  - alert [ref=f1e2]
  - generic [ref=f1e3]:
    - banner [ref=f1e4]:
      - 'link "Python Foundations: Loops and Lists" [ref=f1e5] [cursor=pointer]':
        - /url: /course/19a780ed-0459-449b-92df-5683b7d71d0a
      - heading "For Loops and Indentation" [level=1] [ref=f1e8]
      - generic [ref=f1e9]:
        - button "Open editor" [ref=f1e10]
        - button "Switch language to Hindi" [ref=f1e14]: हिन्दी
        - button "Toggle theme" [ref=f1e19]
    - generic [ref=f1e22]:
      - region "Lesson" [ref=f1e23]:
        - generic [ref=f1e24]:
          - generic "lesson script" [ref=f1e25]: Gemini · lesson script
          - generic [ref=f1e26]: "Python Foundations: Loops and Indentation"
        - generic [ref=f1e27]:
          - generic [ref=f1e29]:
            - generic [ref=f1e34]:
              - generic [ref=f1e35]: Topic
              - generic [ref=f1e36]: "Source: page 1"
              - generic [ref=f1e41]:
                - generic [ref=f1e42]: Loops and Indentation
                - generic [ref=f1e43]: Stop repeating yourself and let Python do the work.
              - generic [ref=f1e44]:
                - generic [ref=f1e45]: Welcome
                - generic [ref=f1e46]: to
                - generic [ref=f1e47]: Python
                - generic [ref=f1e48]: Foundations.
                - generic [ref=f1e49]: Today
                - generic [ref=f1e50]: we
                - generic [ref=f1e51]: will
                - generic [ref=f1e52]: learn
                - generic [ref=f1e53]: how
                - generic [ref=f1e54]: to
                - generic [ref=f1e55]: make
                - generic [ref=f1e56]: computers
                - generic [ref=f1e57]: do
                - generic [ref=f1e58]: the
                - generic [ref=f1e59]: hard
                - generic [ref=f1e60]: work
                - generic [ref=f1e61]: for
                - generic [ref=f1e62]: us
                - generic [ref=f1e63]: by
                - generic [ref=f1e64]: repeating
            - generic [ref=f1e65]:
              - generic [ref=f1e66]:
                - generic [ref=f1e67]:
                  - button "Play video" [active] [ref=f1e68] [cursor=pointer]
                  - button "Mute sound" [ref=f1e72] [cursor=pointer]
                  - generic [ref=f1e75]: 0:00 / 1:20
                - button "Enter Fullscreen" [ref=f1e77] [cursor=pointer]
              - generic [ref=f1e84] [cursor=pointer]
          - generic [ref=f1e88]:
            - generic [ref=f1e89]: Scene 1 of 7 · TitleCard
            - generic [ref=f1e90]:
              - text: "Source:"
              - button "p. 1" [ref=f1e91]
            - button "Narration on" [pressed] [ref=f1e92]
          - list [ref=f1e97]:
            - listitem "TitleCard (p. 1)" [ref=f1e98]
            - listitem "Analogy (p. 1)" [ref=f1e99]
            - listitem "CodeReveal (p. 2)" [ref=f1e100]
            - listitem "VariableTracker (p. 2)" [ref=f1e101]
            - listitem "FlowDiagram (p. 2)" [ref=f1e102]
            - listitem "CodeReveal (p. 3)" [ref=f1e103]
            - listitem "VariableTracker (p. 3)" [ref=f1e104]
      - complementary "Code editor" [ref=f1e105]:
        - generic [ref=f1e107]:
          - generic [ref=f1e108]:
            - combobox "Language" [ref=f1e109]:
              - option "Python" [selected]
              - option "JavaScript"
              - option "HTML / CSS / JS"
              - option "React"
              - option "C"
              - option "C++"
              - option "Java"
              - option "Go"
              - option "Rust"
            - generic [ref=f1e110]:
              - button "Run" [ref=f1e111]
              - button "Check" [disabled]
              - button "Reset" [ref=f1e114]
              - button "Ask Guru" [ref=f1e118]
          - code [ref=f1e125]:
            - generic [ref=f1e126]:
              - textbox "Editor content"
              - textbox [aria-hidden] [ref=f1e127]
              - generic [aria-hidden] [ref=f1e129]:
                - generic [ref=f1e130]:
                  - generic [ref=f1e132] [cursor=pointer]: 
                  - generic [ref=f1e133]: "1"
                - generic [ref=f1e134]: "2"
                - generic [ref=f1e136]:
                  - generic [ref=f1e137] [cursor=pointer]: 
                  - generic [ref=f1e138]: "3"
                - generic [ref=f1e139]: "4"
                - generic [ref=f1e141]: "5"
                - generic [ref=f1e143]: "6"
              - generic [aria-hidden] [ref=f1e158]:
                - generic [ref=f1e159]: "def sum_to(n):"
                - generic [ref=f1e161]: total = 0
                - generic [ref=f1e163]: "for i in range(1, n):"
                - generic [ref=f1e165]: total += i
                - generic [ref=f1e167]: return total
          - status [ref=f1e171]:
            - generic [ref=f1e174]: Groq
            - generic [ref=f1e175]: "Try adding a test call like `print(sum_to(5))` to see if the result matches 15. Ask Guru if you'd like more."
            - button "Dismiss tip" [ref=f1e176]
          - generic [ref=f1e180]:
            - tablist [ref=f1e181]:
              - tab "Console" [selected] [ref=f1e182]
              - tab "Tests" [ref=f1e183]
              - tab "Input" [ref=f1e184]
            - paragraph [ref=f1e186]: Run your code to see output here. (Ctrl/Cmd + Enter)
    - region "Guru, your tutor" [ref=f1e187]:
      - generic [ref=f1e188]:
        - generic [ref=f1e192]:
          - heading "Guru" [level=2] [ref=f1e193]
          - paragraph [ref=f1e194]: Your tutor. Sees your code, cites your pages.
        - button "Close Guru" [ref=f1e195]
      - paragraph [ref=f1e200]: Ask me anything about this lesson, or press Hint when you get stuck. I will ask questions before I give answers.
      - generic [ref=f1e201]:
        - textbox "Ask Guru" [ref=f1e202]:
          - /placeholder: Ask Guru…
        - button "Send" [disabled]
  - generic [ref=f1e203]:
    - alert
    - alert
```