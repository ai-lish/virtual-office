// 2025-26 中一第二學期數學科考試 - 題目數據
// 卷一

const examData = {
  "p1": {
    title: "卷一 (70分)",
    subject: "數學科",
    exam: "2025-26 中一第二學期",
    school: "中華聖潔會靈風中學",
    questions: [
      {
        id: "Q1",
        section: "甲部",
        text: "寫 18 的質因數連乘式，並以指數記數法表示答案。",
        totalMarks: 1,
        requireSteps: false,
        answer: {
          keywords: ["2×3²", "2×3^2", "2*3^2", "2×3二次方"],
          unit: ""
        }
      },
      {
        id: "Q2",
        section: "甲部",
        text: "求 30 和 18 的 H.C.F. (最大公因數)。",
        totalMarks: 1,
        requireSteps: false,
        answer: {
          keywords: ["6", "六"],
          unit: ""
        }
      },
      {
        id: "Q3",
        section: "甲部",
        text: "$-3 + (-4) =$",
        totalMarks: 1,
        requireSteps: false,
        answer: {
          keywords: ["-7", "負七"],
          unit: ""
        }
      },
      {
        id: "Q4",
        section: "甲部",
        text: "$(-4)(-8) =$",
        totalMarks: 1,
        requireSteps: false,
        answer: {
          keywords: ["32", "三十二"],
          unit: ""
        }
      },
      {
        id: "Q5",
        section: "甲部",
        text: "以代數式表示「由 $x$ 減去 5 之差除以 2」。",
        totalMarks: 1,
        requireSteps: false,
        answer: {
          keywords: ["(x-5)÷2", "(x-5)/2", "「x-5」÷2", "「x-5」/2"],
          unit: ""
        }
      },
      {
        id: "Q6",
        section: "甲部",
        text: "解 $x - 5 = -2$。",
        totalMarks: 1,
        requireSteps: false,
        answer: {
          keywords: ["x=3", "x = 3"],
          unit: ""
        }
      },
      {
        id: "Q7",
        section: "甲部",
        text: "解 $3x = -24$。",
        totalMarks: 1,
        requireSteps: false,
        answer: {
          keywords: ["x=-8", "x = -8"],
          unit: ""
        }
      },
      {
        id: "Q8",
        section: "甲部",
        text: "求圖中長方體的體積 (長=10cm, 闊=2cm, 高=5cm)。",
        totalMarks: 2,
        requireSteps: true,
        steps: [
          { mark: "1M", keywords: ["V=l×w×h", "體積=長×闊×高", "10×2×5"], desc: "寫出體積公式並代入數值" }
        ],
        answer: {
          keywords: ["100", "一百"],
          unit: "cm³"
        }
      },
      {
        id: "Q9",
        section: "甲部",
        text: "按 $x$ 的降冪次序排列 $4x - 3 + x^2$。",
        totalMarks: 1,
        requireSteps: false,
        answer: {
          keywords: ["x²+4x-3", "x^2+4x-3"],
          unit: ""
        }
      },
      {
        id: "Q10",
        section: "甲部",
        text: "寫出多項式 $x^2y + 4x - 10$ 中的常數項。",
        totalMarks: 1,
        requireSteps: false,
        answer: {
          keywords: ["-10", "負十", "-10"],
          unit: ""
        }
      },
      {
        id: "Q11",
        section: "甲部",
        text: "化簡 $7a - 2a - 4$。",
        totalMarks: 1,
        requireSteps: false,
        answer: {
          keywords: ["5a-4", "5a - 4"],
          unit: ""
        }
      },
      {
        id: "Q12",
        section: "甲部",
        text: "展開 $-2(3x - 1)$。",
        totalMarks: 1,
        requireSteps: false,
        answer: {
          keywords: ["-6x+2", "-6x + 2"],
          unit: ""
        }
      },
      {
        id: "Q13",
        section: "甲部",
        text: "寫出坐標 $(2, -3)$ 的 $y$ 坐標。",
        totalMarks: 1,
        requireSteps: false,
        answer: {
          keywords: ["-3", "負三"],
          unit: ""
        }
      },
      {
        id: "Q14",
        section: "甲部",
        text: "求坐標 $B(-3, 1)$ 的象限。",
        totalMarks: 1,
        requireSteps: false,
        answer: {
          keywords: ["第二象限", "二", "2"],
          unit: ""
        }
      },
      // 乙部
      {
        id: "Q15",
        section: "乙部",
        text: "計算以下各題：\n(a) $\\dfrac{10 + 3 \\times 2}{2}$\n(b) $\\dfrac{2}{3} - \\dfrac{4}{9}$",
        totalMarks: 4,
        requireSteps: true,
        subParts: ["(a)", "(b)"],
        steps: [
          { mark: "1M", part: "(a)", keywords: ["10+6", "16÷2", "8"], desc: "計算 (a) 部分" },
          { mark: "1A", part: "(a)", keywords: ["8"], desc: "(a) 答案正確" },
          { mark: "1M", part: "(b)", keywords: ["6/9-4/9", "2/9"], desc: "計算 (b) 部分" },
          { mark: "1A", part: "(b)", keywords: ["2/9", "²/₉"], desc: "(b) 答案正確" }
        ],
        answer: {
          keywords: ["8", "2/9"],
          unit: ""
        }
      },
      {
        id: "Q16",
        section: "乙部",
        text: "考慮公式 $P = 20 - 3a$。當 $a = -4$ 時，求 $P$ 的值。",
        totalMarks: 2,
        requireSteps: true,
        steps: [
          { mark: "1M", keywords: ["20-3(-4)", "20+12"], desc: "代入 a = -4" },
          { mark: "1A", keywords: ["32", "P=32"], desc: "答案正確" }
        ],
        answer: {
          keywords: ["32", "P=32"],
          unit: ""
        }
      },
      {
        id: "Q17",
        section: "乙部",
        text: "考慮多項式 $4x^3 - x + 5$，完成下表：\n項數、次數、$x$ 的係數、$x^2$ 的係數",
        totalMarks: 6,
        requireSteps: true,
        steps: [
          { mark: "1M", keywords: ["項數3", "3項"], desc: "項數正確" },
          { mark: "1M", keywords: ["次數3", "3次"], desc: "次數正確" },
          { mark: "1M", keywords: ["x係數-1", "係數-1", "-1"], desc: "x係數正確" },
          { mark: "1M", keywords: ["x²係數0", "0", "零"], desc: "x²係數正確" }
        ],
        answer: {
          keywords: ["3", "3", "-1", "0"],
          unit: ""
        }
      },
      {
        id: "Q18",
        section: "乙部",
        text: "化簡下列各式：\n(a) $3x - 7 + x - 1$\n(b) $(a + 3b) - (4a - 3b)$",
        totalMarks: 4,
        requireSteps: true,
        steps: [
          { mark: "1M", part: "(a)", keywords: ["4x-8", "4x - 8"], desc: "化簡 (a)" },
          { mark: "1A", part: "(a)", keywords: ["4x-8"], desc: "(a) 正確" },
          { mark: "1M", part: "(b)", keywords: ["-3a+6b", "-3a + 6b"], desc: "化簡 (b)" },
          { mark: "1A", part: "(b)", keywords: ["-3a+6b"], desc: "(b) 正確" }
        ],
        answer: {
          keywords: ["4x-8", "-3a+6b"],
          unit: ""
        }
      },
      {
        id: "Q19",
        section: "乙部",
        text: "展開下列各式：\n(a) $3x(x - 4)$\n(b) $(x - 2)(3x - 1)$",
        totalMarks: 5,
        requireSteps: true,
        steps: [
          { mark: "1M", part: "(a)", keywords: ["3x²-12x", "3x^2-12x"], desc: "展開 (a)" },
          { mark: "1A", part: "(a)", keywords: ["3x²-12x"], desc: "(a) 正確" },
          { mark: "1M", part: "(b)", keywords: ["3x²-7x+2", "3x^2-7x+2"], desc: "展開 (b)" },
          { mark: "1M", part: "(b)", keywords: ["3x²-7x+2"], desc: "(b) 化簡" },
          { mark: "1A", part: "(b)", keywords: ["3x²-7x+2"], desc: "(b) 正確" }
        ],
        answer: {
          keywords: ["3x²-12x", "3x^2-12x", "3x²-7x+2", "3x^2-7x+2"],
          unit: ""
        }
      },
      {
        id: "Q20",
        section: "乙部",
        text: "解下列各方程：\n(a) $5x - 3 = 3x + 9$\n(b) $\\dfrac{x + 18}{4} = 2 - x$",
        totalMarks: 6,
        requireSteps: true,
        steps: [
          { mark: "1M", part: "(a)", keywords: ["5x-3x=9+3", "2x=12"], desc: "移項 (a)" },
          { mark: "1M", part: "(a)", keywords: ["x=6"], desc: "求解 (a)" },
          { mark: "1A", part: "(a)", keywords: ["x=6", "6"], desc: "(a) 正確" },
          { mark: "1M", part: "(b)", keywords: ["x+18=4(2-x)", "x+18=8-4x"], desc: "去分母 (b)" },
          { mark: "1M", part: "(b)", keywords: ["5x=-10"], desc: "移項 (b)" },
          { mark: "1A", part: "(b)", keywords: ["x=-2", "-2"], desc: "(b) 正確" }
        ],
        answer: {
          keywords: ["x=6", "6", "x=-2", "-2"],
          unit: ""
        }
      },
      {
        id: "Q21",
        section: "乙部",
        text: "求圖中多邊形 $ABCDE$ 的面積 (梯形減三角形)。\n上底=12cm, 下底=20cm, 高=10cm, 三角形AB=4cm, BC=10cm",
        totalMarks: 4,
        requireSteps: true,
        steps: [
          { mark: "1M", keywords: ["梯形面積=(12+20)×10÷2", "160"], desc: "計算梯形面積" },
          { mark: "1A", keywords: ["160"], desc: "梯形面積正確" },
          { mark: "1M", keywords: ["三角形=4×10÷2", "20"], desc: "計算三角形面積" },
          { mark: "1ft", keywords: ["160-20", "40"], desc: "相減得答案" }
        ],
        answer: {
          keywords: ["40", "四十"],
          unit: "cm²"
        }
      },
      {
        id: "Q22",
        section: "乙部",
        text: "已知圖中的直立角柱的體積為 $480\\text{ cm}^3$。求 $x$ 的值。\n(底為平行四邊形，底=15cm, 另一邊=10cm, 高=x, 角柱高=8cm)",
        totalMarks: 5,
        requireSteps: true,
        steps: [
          { mark: "1M", keywords: ["底面積=15×10", "150"], desc: "計算底面積" },
          { mark: "1A", keywords: ["150"], desc: "底面積正確" },
          { mark: "1M", keywords: ["480=150×x×8", "480=1200x"], desc: "寫出體積公式" },
          { mark: "1M", keywords: ["x=480÷1200", "x=0.4"], desc: "求解 x" },
          { mark: "1A", keywords: ["x=4", "4"], desc: "答案正確" }
        ],
        answer: {
          keywords: ["4", "x=4"],
          unit: "cm"
        }
      },
      {
        id: "Q23",
        section: "乙部",
        text: "(a) 在以下的直角坐標平面上標示 $A(6, 5)$ 和 $B(-4, 5)$。\n(b) (i) 求 $AB$ 的長度。\n(b) (ii) 求 $\\triangle AOB$ 的面積 ($O$為原點)。",
        totalMarks: 6,
        requireSteps: true,
        steps: [
          { mark: "1A", part: "(a)", keywords: ["標示A", "標示B"], desc: "正確標示 A 和 B" },
          { mark: "1M", part: "(b)(i)", keywords: ["|6-(-4)|", "10"], desc: "計算 AB 長度" },
          { mark: "1A", part: "(b)(i)", keywords: ["10"], desc: "(i) 正確" },
          { mark: "1M", part: "(b)(ii)", keywords: ["10×5÷2", "25"], desc: "計算面積" },
          { mark: "1A", part: "(b)(ii)", keywords: ["25"], desc: "(ii) 正確" }
        ],
        answer: {
          keywords: ["10", "25"],
          unit: ""
        }
      },
      // 丙部
      {
        id: "Q24",
        section: "丙部",
        text: "計算 $\\frac{(-21)+(7)(-2)}{-(-9)(5)}$。",
        totalMarks: 3,
        requireSteps: true,
        steps: [
          { mark: "1M", keywords: ["-21+(7)(-2)", "-21-14", "-35"], desc: "計算分子" },
          { mark: "1M", keywords: ["-(-9)(5)", "45"], desc: "計算分母" },
          { mark: "1A", keywords: ["-7/9", "-7÷9", "-0.777"], desc: "答案正確" }
        ],
        answer: {
          keywords: ["-7/9", "-7÷9", "負九分之七"],
          unit: ""
        }
      },
      {
        id: "Q25",
        section: "丙部",
        text: "化簡：\n(a) $(2x - 3)^2$\n(b) $(2x - 3)^2 - 4x - 7$",
        totalMarks: 4,
        requireSteps: true,
        steps: [
          { mark: "1M", part: "(a)", keywords: ["(2x)²-2(2x)(3)+3²", "4x²-12x+9"], desc: "展開 (a)" },
          { mark: "1A", part: "(a)", keywords: ["4x²-12x+9"], desc: "(a) 正確" },
          { mark: "1M", part: "(b)", keywords: ["4x²-16x+2"], desc: "化簡 (b)" },
          { mark: "1A", part: "(b)", keywords: ["4x²-16x+2"], desc: "(b) 正確" }
        ],
        answer: {
          keywords: ["4x²-12x+9", "4x²-16x+2"],
          unit: ""
        }
      },
      {
        id: "Q26",
        section: "丙部",
        text: "現時悟空的年齡是悟飯的 2 倍少 3 歲。17 年後，悟飯與悟空的年齡之和為 100 歲。求 17 年後悟空的年齡。",
        totalMarks: 6,
        requireSteps: true,
        steps: [
          { mark: "1M", keywords: ["設悟飯x歲", "悟空2x-3歲"], desc: "設立方程" },
          { mark: "1M", keywords: ["x+17+2x-3+17=100", "3x+31=100"], desc: "寫出17年後方程" },
          { mark: "1M", keywords: ["x=23"], desc: "求解悟飯年齡" },
          { mark: "1ft", keywords: ["悟空今年43歲"], desc: "計算悟空今年年齡" },
          { mark: "1A", keywords: ["60", "60歲"], desc: "答案正確" }
        ],
        answer: {
          keywords: ["60", "60歲"],
          unit: "歲"
        }
      },
      {
        id: "Q27",
        section: "丙部",
        text: "下圖顯示一個盛有水的密封玻璃長方體形容器。現把該容器垂直放置使其高為 15cm。\n(a) 求水的體積。\n(b) 求 $h$ 的值。\n(c) 比達宣稱容器改變放置方向後，容器浸濕部份的總表面面積沒有改變。你是否同意？試解釋你的答案。",
        totalMarks: 8,
        requireSteps: true,
        steps: [
          { mark: "1M", part: "(a)", keywords: ["8×8×1", "64"], desc: "計算水體積" },
          { mark: "1A", part: "(a)", keywords: ["64"], desc: "(a) 正確" },
          { mark: "1M", part: "(b)", keywords: ["64=32×h", "h=4"], desc: "求 h" },
          { mark: "1M", part: "(b)", keywords: ["h=4"], desc: "h 正確" },
          { mark: "1A", part: "(b)", keywords: ["4"], desc: "(b) 正確" },
          { mark: "1M", part: "(c)", keywords: ["同意", "是"], desc: "表明立場" },
          { mark: "1A", part: "(c)", keywords: ["浸濕面積相同", "四個面"], desc: "解釋原因" }
        ],
        answer: {
          keywords: ["64", "4", "同意", "是"],
          unit: ""
        }
      },
      {
        id: "Q28",
        section: "丙部",
        text: "給予三個點：$A(-2, 5)$、$B(2, -3)$ 和 $C(6, -1)$。\n點 $A$ 沿 $y$ 軸反射至 $D$。\n點 $A$ 繞原點 $O$ 逆時針方向旋轉 $180^\\circ$ 至 $E$。\n點 $B$ 向右平移 4 個單位至 $F$。\n(a) 寫出 $D$、$E$ 及 $F$ 的坐標。\n(b) 求四邊形 $CDEF$ 的面積。",
        totalMarks: 6,
        requireSteps: true,
        steps: [
          { mark: "1A", part: "(a)", keywords: ["D(2,5)"], desc: "D 坐標正確" },
          { mark: "1A", part: "(a)", keywords: ["E(2,-5)"], desc: "E 坐標正確" },
          { mark: "1A", part: "(a)", keywords: ["F(6,-3)"], desc: "F 坐標正確" },
          { mark: "1M", part: "(b)", keywords: ["梯形", "20"], desc: "識別圖形" },
          { mark: "1M", part: "(b)", keywords: ["(4+4)×10÷2", "20"], desc: "計算面積" },
          { mark: "1A", part: "(b)", keywords: ["20"], desc: "(b) 正確" }
        ],
        answer: {
          keywords: ["D(2,5)", "E(2,-5)", "F(6,-3)", "20"],
          unit: ""
        }
      },
      {
        id: "Q29",
        section: "丙部",
        text: "Match the appropriate English name to the prism.\n圖一：三棱柱\n圖二：正方體",
        totalMarks: 2,
        requireSteps: false,
        answer: {
          keywords: ["triangular prism", "cube", "Triangular Prism", "Cube"],
          unit: ""
        }
      }
    ]
  },
  // 卷二
  "p2": {
    title: "卷二 (40分)",
    subject: "數學科",
    exam: "2025-26 中一第二學期",
    school: "中華聖潔會靈風中學",
    questions: [
      {
        id: "Q1",
        section: "甲部",
        text: "計算 $\\frac{5}{2}+\\frac{4}{3}$。",
        type: "mc",
        options: {
          A: "$\\frac{20}{6}$",
          B: "$\\frac{23}{6}$",
          C: "$\\frac{9}{5}$",
          D: "$\\frac{10}{3}$"
        },
        correct: "B"
      },
      {
        id: "Q2",
        section: "甲部",
        text: "以下哪一些句子是對的？\nI. 2026 是質數。\nII. 2026 可被 2 整除。\nIII. 2026 和 4 的最大公因數是 4。",
        type: "mc",
        options: {
          A: "只有 II",
          B: "II 和 III",
          C: "I 和 III",
          D: "I、II 和 III"
        },
        correct: "A"
      },
      {
        id: "Q3",
        section: "甲部",
        text: "計算 $-4-(-3)$ 的值。",
        type: "mc",
        options: {
          A: "-7",
          B: "-1",
          C: "1",
          D: "7"
        },
        correct: "B"
      },
      {
        id: "Q4",
        section: "甲部",
        text: "計算 $-5^2$ 的值。",
        type: "mc",
        options: {
          A: "25",
          B: "10",
          C: "-10",
          D: "-25"
        },
        correct: "D"
      },
      {
        id: "Q5",
        section: "甲部",
        text: "試以代數式表示「$x$與$y$之和的平方」。",
        type: "mc",
        options: {
          A: "$2(x+y)$",
          B: "$2(x-y)$",
          C: "$x^2-y^2$",
          D: "$(x+y)^2$"
        },
        correct: "D"
      },
      {
        id: "Q6",
        section: "甲部",
        text: "若 $y=-2$，求 $7-y$ 的值。",
        type: "mc",
        options: {
          A: "-9",
          B: "-5",
          C: "5",
          D: "9"
        },
        correct: "D"
      },
      {
        id: "Q7",
        section: "甲部",
        text: "考慮數列 $a_n = \\frac{3n}{10}$，求數列的 $a_2$。",
        type: "mc",
        options: {
          A: "$\\frac{5}{3}$",
          B: "$\\frac{3}{5}$",
          C: "$\\frac{6}{5}$",
          D: "15"
        },
        correct: "B"
      },
      {
        id: "Q8",
        section: "甲部",
        text: "解方程 $x-5=10$。",
        type: "mc",
        options: {
          A: "$x=-2$",
          B: "$x=3$",
          C: "$x=15$",
          D: "$x=50$"
        },
        correct: "C"
      },
      {
        id: "Q9",
        section: "甲部",
        text: "解方程 $-4x=8$。",
        type: "mc",
        options: {
          A: "$x=-2$",
          B: "$x=-4$",
          C: "$x=2$",
          D: "$x=4$"
        },
        correct: "A"
      },
      {
        id: "Q10",
        section: "甲部",
        text: "若按右圖中所示方向把長方錐切開，其截面（即陰影部分）是甚麼形狀？",
        type: "mc",
        options: {
          A: "長方形",
          B: "三角形",
          C: "梯形",
          D: "平行四邊形"
        },
        correct: "C"
      },
      {
        id: "Q11",
        section: "甲部",
        text: "求右圖三角形的面積。",
        type: "mc",
        options: {
          A: "$21~cm^2$",
          B: "$14~cm^2$",
          C: "$10.5~cm^2$",
          D: "$7~cm^2$"
        },
        correct: "D"
      },
      {
        id: "Q12",
        section: "甲部",
        text: "求右圖中陰影區域的面積。",
        type: "mc",
        options: {
          A: "$70\\text{ cm}^2$",
          B: "$80\\text{ cm}^2$",
          C: "$90\\text{ cm}^2$",
          D: "$100\\text{ cm}^2$"
        },
        correct: "B"
      },
      {
        id: "Q13",
        section: "甲部",
        text: "求右圖中直立角柱的體積。",
        type: "mc",
        options: {
          A: "$180~cm^3$",
          B: "$270~cm^3$",
          C: "$360~cm^3$",
          D: "$720~cm^3$"
        },
        correct: "A"
      },
      {
        id: "Q14",
        section: "甲部",
        text: "右圖中，直立角柱的總表面面積是：",
        type: "mc",
        options: {
          A: "$88~cm^2$",
          B: "$104~cm^2$",
          C: "$126~cm^2$",
          D: "$148~cm^2$"
        },
        correct: "D"
      },
      {
        id: "Q15",
        section: "乙部",
        text: "下列何者是一對同類項？\nI. $-3y$\nII. $-3x$\nIII. $x$\nIV. $xy$",
        type: "mc",
        options: {
          A: "I及II",
          B: "I及IV",
          C: "II及III",
          D: "III及IV"
        },
        correct: "C"
      },
      {
        id: "Q16",
        section: "乙部",
        text: "化簡 $-5y+2y-y$。",
        type: "mc",
        options: {
          A: "$-2y$",
          B: "$-3y$",
          C: "$-4y$",
          D: "$-8y$"
        },
        correct: "C"
      },
      {
        id: "Q17",
        section: "乙部",
        text: "化簡 $9x-8-(7x-6)$。",
        type: "mc",
        options: {
          A: "$2x$",
          B: "$2x-2$",
          C: "$2x-14$",
          D: "$2x^2+2$"
        },
        correct: "B"
      },
      {
        id: "Q18",
        section: "乙部",
        text: "化簡 $x^2-3x+4-3x+2x^2-5$。",
        type: "mc",
        options: {
          A: "$-x^2-6x-1$",
          B: "$-x^2-6x+9$",
          C: "$-2x^2-x-1$",
          D: "$3x^2-6x-1$"
        },
        correct: "D"
      },
      {
        id: "Q19",
        section: "乙部",
        text: "化簡 $3y(4xy)$。",
        type: "mc",
        options: {
          A: "$7xy^2$",
          B: "$12xy$",
          C: "$12y(x+1)$",
          D: "$12xy^2$"
        },
        correct: "D"
      },
      {
        id: "Q20",
        section: "乙部",
        text: "化簡 $k^4 \\times k^5 \\times k^6 =$",
        type: "mc",
        options: {
          A: "$k^{15}$",
          B: "$k^{26}$",
          C: "$k^{34}$",
          D: "$k^{120}$"
        },
        correct: "A"
      },
      {
        id: "Q21",
        section: "乙部",
        text: "化簡 $\\frac{x^6}{x^3}$。",
        type: "mc",
        options: {
          A: "$x^2$",
          B: "$x^3$",
          C: "$\\frac{1}{x^2}$",
          D: "$\\frac{1}{x^3}$"
        },
        correct: "B"
      },
      {
        id: "Q22",
        section: "乙部",
        text: "展開 $(-5)(2p-1)$。",
        type: "mc",
        options: {
          A: "$-10p+1$",
          B: "$-10p-5$",
          C: "$-10p+5$",
          D: "$10p+5$"
        },
        correct: "C"
      },
      {
        id: "Q23",
        section: "乙部",
        text: "解方程 $\\frac{x+4}{3}=-1$。",
        type: "mc",
        options: {
          A: "$x=-7$",
          B: "$x=-6$",
          C: "$x=-4$",
          D: "$x=1$"
        },
        correct: "A"
      },
      {
        id: "Q24",
        section: "乙部",
        text: "解方程 $5p-4=-p$。",
        type: "mc",
        options: {
          A: "$p=\\frac{3}{2}$",
          B: "$p=1$",
          C: "$p=\\frac{2}{3}$",
          D: "$p=-1$"
        },
        correct: "C"
      },
      {
        id: "Q25",
        section: "乙部",
        text: "解方程 $2(9-a)=5a+4$。",
        type: "mc",
        options: {
          A: "$a=-7$",
          B: "$a=2$",
          C: "$a=14$",
          D: "$a=74$"
        },
        correct: "B"
      }
    ]
  }
};

// 匯出數據
if (typeof module !== 'undefined' && module.exports) {
  module.exports = examData;
}
