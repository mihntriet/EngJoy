/**
 * EngJoy Authoritative Lesson Curriculum & Exercise Bank
 * Quest 1: A1 - Vùng Đất Khởi Đầu (8 Units)
 *
 * Structure:
 * LESSON_CONTENT[questId][unitId] = {
 *   title: string,
 *   intro: string,
 *   vocabulary: [ { id, word, phonetic, meaning, example } ],
 *   questions: [ { id, type: "multiple_choice", question, options, answer, explanation } ]
 * }
 */

const LESSON_CONTENT = {
  1: {
    // ─── Unit 1: Bảng chữ cái & Phát âm ─────────────────────────────────────────
    1: {
      title: "Bảng chữ cái & Phát âm",
      intro: "Chào mừng bạn đến với thế giới tiếng Anh! Bắt đầu bằng việc làm quen với các nguyên âm, phụ âm và bảng chữ cái 26 chữ cái cơ bản.",
      vocabulary: [
        {
          id: "u1_v1",
          word: "Alphabet",
          phonetic: "/ˈæl.fə.bet/",
          meaning: "Bảng chữ cái (gồm 26 chữ cái từ A đến Z)",
          example: "The English alphabet has 26 letters."
        },
        {
          id: "u1_v2",
          word: "Vowel",
          phonetic: "/ˈvaʊ.əl/",
          meaning: "Nguyên âm (gồm 5 chữ cái: A, E, I, O, U)",
          example: "English has five vowel letters: A, E, I, O, U."
        },
        {
          id: "u1_v3",
          word: "Consonant",
          phonetic: "/ˈkɒn.sə.nənt/",
          meaning: "Phụ âm (các chữ cái còn lại như B, C, D, F, G...)",
          example: "The letter 'B' is a consonant."
        },
        {
          id: "u1_v4",
          word: "Pronounce",
          phonetic: "/prəˈnaʊns/",
          meaning: "Phát âm, đọc chuẩn xác một từ",
          example: "How do you pronounce this word?"
        }
      ],
      questions: [
        {
          id: "u1_q1",
          type: "multiple_choice",
          question: "Bảng chữ cái tiếng Anh chuẩn có tất cả bao nhiêu chữ cái?",
          options: ["24 chữ cái", "26 chữ cái", "28 chữ cái", "30 chữ cái"],
          answer: 1,
          explanation: "Bảng chữ cái tiếng Anh chuẩn (Alphabet) bao gồm chính xác 26 chữ cái từ A đến Z."
        },
        {
          id: "u1_q2",
          type: "multiple_choice",
          question: "Nhóm chữ cái nào dưới đây là 5 nguyên âm cơ bản (Vowels) trong tiếng Anh?",
          options: ["B, C, D, F, G", "A, E, I, O, U", "X, Y, Z, W, Q", "H, J, K, L, M"],
          answer: 1,
          explanation: "5 nguyên âm cốt lõi trong tiếng Anh là A, E, I, O, U (thường được nhớ bằng mẹo 'uể oải')."
        },
        {
          id: "u1_q3",
          type: "multiple_choice",
          question: "Chữ cái nào sau đây là một phụ âm (Consonant)?",
          options: ["A", "E", "I", "T"],
          answer: 3,
          explanation: "A, E, I là nguyên âm (Vowel). Chỉ có 'T' là phụ âm (Consonant)."
        },
        {
          id: "u1_q4",
          type: "multiple_choice",
          question: "Khi muốn hỏi 'Bạn phát âm từ này như thế nào?', câu nào là đúng ngữ pháp?",
          options: [
            "How do you pronounce this word?",
            "How do you alphabet this word?",
            "What vowel is this speak?",
            "Where do you consonant this word?"
          ],
          answer: 0,
          explanation: "'How do you pronounce this word?' là mẫu câu chuẩn để hỏi cách phát âm một từ."
        }
      ]
    },

    // ─── Unit 2: Chào hỏi & Tự giới thiệu ───────────────────────────────────────
    2: {
      title: "Chào hỏi & Tự giới thiệu",
      intro: "Nắm vững các câu chào lịch sự và cách giới thiệu tên tuổi, quốc tịch tự tin trong lần gặp đầu tiên.",
      vocabulary: [
        {
          id: "u2_v1",
          word: "Hello",
          phonetic: "/həˈloʊ/",
          meaning: "Xin chào (lời chào phổ thông)",
          example: "Hello! Nice to meet you."
        },
        {
          id: "u2_v2",
          word: "Goodbye",
          phonetic: "/ˌɡʊdˈbaɪ/",
          meaning: "Tạm biệt",
          example: "Goodbye, see you tomorrow!"
        },
        {
          id: "u2_v3",
          word: "Name",
          phonetic: "/neɪm/",
          meaning: "Tên gọi của một người",
          example: "My name is John."
        },
        {
          id: "u2_v4",
          word: "Country",
          phonetic: "/ˈkʌn.tri/",
          meaning: "Đất nước, quốc gia",
          example: "I come from Vietnam."
        }
      ],
      questions: [
        {
          id: "u2_q1",
          type: "multiple_choice",
          question: "Để trả lời câu hỏi 'What is your name?', câu trả lời tự nhiên và chính xác nhất là:",
          options: [
            "I am fine, thank you.",
            "My name is Alex.",
            "I am from Vietnam.",
            "Nice to see you."
          ],
          answer: 1,
          explanation: "'My name is [Tên]' hoặc 'I am [Tên]' là cấu trúc chuẩn để giới thiệu tên mình."
        },
        {
          id: "u2_q2",
          type: "multiple_choice",
          question: "Khi lần đầu tiên gặp một người bạn mới, bạn nên nói câu nào lịch sự nhất?",
          options: [
            "Goodbye, see you again!",
            "Nice to meet you!",
            "What time is it now?",
            "I don't like reading."
          ],
          answer: 1,
          explanation: "'Nice to meet you!' (Rất vui được gặp bạn) là lời chào xã giao lịch sự khi gặp ai đó lần đầu."
        },
        {
          id: "u2_q3",
          type: "multiple_choice",
          question: "Điền từ thích hợp vào chỗ trống: 'Where are you _____?' - 'I am from Vietnam.'",
          options: ["for", "at", "from", "on"],
          answer: 2,
          explanation: "Cấu trúc hỏi xuất xứ/quê hương: 'Where are you from?' (Bạn đến từ đâu?)."
        },
        {
          id: "u2_q4",
          type: "multiple_choice",
          question: "Từ nào sau đây mang ý nghĩa là 'Tạm biệt'?",
          options: ["Welcome", "Goodbye", "Please", "Thanks"],
          answer: 1,
          explanation: "'Goodbye' hoặc 'Bye' nghĩa là tạm biệt."
        }
      ]
    },

    // ─── Unit 3: Số đếm & Màu sắc ───────────────────────────────────────────────
    3: {
      title: "Số đếm & Màu sắc",
      intro: "Nhận biết các con số cơ bản từ 1 đến 100 và phân biệt bảng màu sắc sinh động quanh ta.",
      vocabulary: [
        {
          id: "u3_v1",
          word: "Number",
          phonetic: "/ˈnʌm.bər/",
          meaning: "Con số, số lượng",
          example: "Seven is my lucky number."
        },
        {
          id: "u3_v2",
          word: "Color",
          phonetic: "/ˈkʌl.ər/",
          meaning: "Màu sắc",
          example: "What is your favorite color?"
        },
        {
          id: "u3_v3",
          word: "Blue",
          phonetic: "/bluː/",
          meaning: "Màu xanh da trời / xanh lam",
          example: "The sky is clear and blue."
        },
        {
          id: "u3_v4",
          word: "Hundred",
          phonetic: "/ˈhʌn.drəd/",
          meaning: "Một trăm (100)",
          example: "There are one hundred coins in the chest."
        }
      ],
      questions: [
        {
          id: "u3_q1",
          type: "multiple_choice",
          question: "Số 15 được viết bằng chữ trong tiếng Anh như thế nào?",
          options: ["Fiveteen", "Fifteen", "Fifty", "Fifth"],
          answer: 1,
          explanation: "15 được viết là 'Fifteen'. (50 là 'Fifty', 5 là 'Five')."
        },
        {
          id: "u3_q2",
          type: "multiple_choice",
          question: "Màu nào sau đây được tạo thành khi pha trộn giữa 'Red' (Đỏ) và 'Yellow' (Vàng)?",
          options: ["Green (Xanh lá)", "Orange (Cam)", "Purple (Tím)", "Black (Đen)"],
          answer: 1,
          explanation: "Red + Yellow = Orange (Màu cam)."
        },
        {
          id: "u3_q3",
          type: "multiple_choice",
          question: "Câu nào sau đây mô tả đúng: 'The grass is _____.'",
          options: ["green", "pink", "purple", "white"],
          answer: 0,
          explanation: "'The grass is green' (Cỏ có màu xanh lá cây)."
        },
        {
          id: "u3_q4",
          type: "multiple_choice",
          question: "Để hỏi 'Cái này có màu gì?', câu nào là chuẩn xác nhất?",
          options: [
            "What color is this?",
            "How number is that?",
            "Where color does it have?",
            "Which number are you?"
          ],
          answer: 0,
          explanation: "'What color is this?' là câu hỏi thông dụng để hỏi màu sắc của một đồ vật."
        }
      ]
    },

    // ─── Unit 4: Gia đình & Bạn bè ──────────────────────────────────────────────
    4: {
      title: "Gia đình & Bạn bè",
      intro: "Học từ vựng về các thành viên gia đình và cách giới thiệu những người thân yêu bằng mẫu câu 'This is my...'.",
      vocabulary: [
        {
          id: "u4_v1",
          word: "Family",
          phonetic: "/ˈfæm.əl.i/",
          meaning: "Gia đình",
          example: "I love spending time with my family."
        },
        {
          id: "u4_v2",
          word: "Parents",
          phonetic: "/ˈpeə.rənts/",
          meaning: "Bố mẹ, phụ huynh (cả cha và mẹ)",
          example: "My parents live in Hanoi."
        },
        {
          id: "u4_v3",
          word: "Brother",
          phonetic: "/ˈbrʌð.ər/",
          meaning: "Anh trai hoặc em trai",
          example: "He has an older brother."
        },
        {
          id: "u4_v4",
          word: "Friend",
          phonetic: "/frend/",
          meaning: "Bạn bè, người bạn",
          example: "She is my best friend."
        }
      ],
      questions: [
        {
          id: "u4_q1",
          type: "multiple_choice",
          question: "Từ nào dùng để chỉ chung cả 'bố và mẹ' của bạn?",
          options: ["Children", "Parents", "Cousins", "Brothers"],
          answer: 1,
          explanation: "'Parents' có nghĩa là cha mẹ / phụ huynh."
        },
        {
          id: "u4_q2",
          type: "multiple_choice",
          question: "Để giới thiệu 'Đây là bạn thân của tôi', bạn sẽ nói:",
          options: [
            "This is my best friend.",
            "That are my friend.",
            "It is mine friends.",
            "These is a friend."
          ],
          answer: 0,
          explanation: "Cấu trúc giới thiệu một người: 'This is my [mối quan hệ]' -> 'This is my best friend.'"
        },
        {
          id: "u4_q3",
          type: "multiple_choice",
          question: "Chị gái hoặc em gái trong tiếng Anh được gọi là gì?",
          options: ["Sister", "Mother", "Aunt", "Daughter"],
          answer: 0,
          explanation: "'Sister' là chị em gái (Mother: mẹ, Aunt: cô/dì/bác gái, Daughter: con gái)."
        },
        {
          id: "u4_q4",
          type: "multiple_choice",
          question: "Điền vào chỗ trống: 'He has two _____. They are 5 and 8 years old.'",
          options: ["brother", "brothers", "father", "mother"],
          answer: 1,
          explanation: "Sau số từ 'two' cần danh từ số nhiều -> 'brothers'."
        }
      ]
    },

    // ─── Unit 5: Đồ vật & Nhà cửa ───────────────────────────────────────────────
    5: {
      title: "Đồ vật & Nhà cửa",
      intro: "Khám phá các phòng trong ngôi nhà và những vật dụng quen thuộc hàng ngày như bàn, ghế, sách vở.",
      vocabulary: [
        {
          id: "u5_v1",
          word: "House",
          phonetic: "/haʊs/",
          meaning: "Ngôi nhà, căn nhà",
          example: "They bought a new house yesterday."
        },
        {
          id: "u5_v2",
          word: "Room",
          phonetic: "/ruːm/",
          meaning: "Căn phòng trong nhà",
          example: "My bedroom is very quiet."
        },
        {
          id: "u5_v3",
          word: "Table",
          phonetic: "/ˈteɪ.bəl/",
          meaning: "Cái bàn",
          example: "The book is on the table."
        },
        {
          id: "u5_v4",
          word: "Door",
          phonetic: "/dɔːr/",
          meaning: "Cửa ra vào",
          example: "Please close the door."
        }
      ],
      questions: [
        {
          id: "u5_q1",
          type: "multiple_choice",
          question: "Căn phòng dùng để nấu nướng thức ăn trong gia đình gọi là gì?",
          options: ["Bathroom", "Bedroom", "Kitchen", "Living room"],
          answer: 2,
          explanation: "'Kitchen' là phòng bếp (Bathroom: nhà tắm, Bedroom: phòng ngủ, Living room: phòng khách)."
        },
        {
          id: "u5_q2",
          type: "multiple_choice",
          question: "Giới từ nào đúng trong câu: 'The laptop is _____ the desk.' (Chiếc laptop ở trên bàn)?",
          options: ["under", "on", "in", "between"],
          answer: 1,
          explanation: "'On the desk' mang nghĩa ở trên mặt bàn."
        },
        {
          id: "u5_q3",
          type: "multiple_choice",
          question: "Từ nào dưới đây KHÔNG phải là một đồ vật trong nhà?",
          options: ["Chair (Ghế)", "Bed (Giường)", "Cloud (Đám mây)", "Lamp (Đèn)"],
          answer: 2,
          explanation: "'Cloud' là đám mây (hiện tượng thiên nhiên ngoài trời), không phải đồ nội thất trong nhà."
        },
        {
          id: "u5_q4",
          type: "multiple_choice",
          question: "Để yêu cầu ai đó mở cửa sổ một cách lịch sự, bạn nói:",
          options: [
            "Open window now!",
            "Please open the window.",
            "You must open window.",
            "Where window open?"
          ],
          answer: 1,
          explanation: "'Please open the window.' là câu cầu khiến lịch sự và chuẩn xác."
        }
      ]
    },

    // ─── Unit 6: Ẩm thực & Mua sắm ──────────────────────────────────────────────
    6: {
      title: "Ẩm thực & Mua sắm",
      intro: "Luyện tập gọi món ăn, đồ uống và các mẫu câu cơ bản khi đi siêu thị hoặc chợ mua sắm.",
      vocabulary: [
        {
          id: "u6_v1",
          word: "Water",
          phonetic: "/ˈwɔː.tər/",
          meaning: "Nước uống",
          example: "Can I have a glass of water, please?"
        },
        {
          id: "u6_v2",
          word: "Bread",
          phonetic: "/bred/",
          meaning: "Bánh mì",
          example: "He eats bread for breakfast every day."
        },
        {
          id: "u6_v3",
          word: "Price",
          phonetic: "/praɪs/",
          meaning: "Giá cả, giá tiền của món hàng",
          example: "The price of this shirt is ten dollars."
        },
        {
          id: "u6_v4",
          word: "Market",
          phonetic: "/ˈmɑː.kɪt/",
          meaning: "Chợ hoặc siêu thị mua sắm",
          example: "She goes to the local market every Sunday."
        }
      ],
      questions: [
        {
          id: "u6_q1",
          type: "multiple_choice",
          question: "Khi muốn hỏi giá của một món đồ trong cửa hàng, câu nào chuẩn nhất?",
          options: [
            "How many is this shirt?",
            "How much is this shirt?",
            "What money is this shirt?",
            "Where cost is this shirt?"
          ],
          answer: 1,
          explanation: "'How much is this...?' là câu hỏi giá tiền tiêu chuẩn trong tiếng Anh."
        },
        {
          id: "u6_q2",
          type: "multiple_choice",
          question: "Để gọi đồ uống trong quán cà phê: 'I would like a cup of _____, please.'",
          options: ["coffee", "bread", "apple", "rice"],
          answer: 0,
          explanation: "'A cup of coffee' (một tách cà phê) là danh từ chỉ đồ uống hợp lý nhất."
        },
        {
          id: "u6_q3",
          type: "multiple_choice",
          question: "Từ nào sau đây mang ý nghĩa là 'Trái cây quả táo'?",
          options: ["Banana", "Apple", "Orange", "Grape"],
          answer: 1,
          explanation: "'Apple' là quả táo (Banana: chuối, Orange: cam, Grape: nho)."
        },
        {
          id: "u6_q4",
          type: "multiple_choice",
          question: "Khi nhân viên thu ngân hỏi 'Cash or card?', họ đang hỏi về điều gì?",
          options: [
            "Hỏi bạn đi một mình hay với bạn bè",
            "Hỏi phương thức thanh toán: tiền mặt hay thẻ ngân hàng",
            "Hỏi bạn có muốn túi nilon không",
            "Hỏi địa chỉ giao hàng tận nhà"
          ],
          answer: 1,
          explanation: "'Cash' là tiền mặt, 'card' là thẻ thanh toán -> hỏi hình thức thanh toán."
        }
      ]
    },

    // ─── Unit 7: Thời gian & Lịch trình ──────────────────────────────────────────
    7: {
      title: "Thời gian & Lịch trình",
      intro: "Biết cách xem giờ, nói về các thứ trong tuần và diễn đạt lịch trình học tập, làm việc hàng ngày.",
      vocabulary: [
        {
          id: "u7_v1",
          word: "Clock",
          phonetic: "/klɒk/",
          meaning: "Đồng hồ treo tường / đồng hồ đo giờ",
          example: "Look at the clock on the wall."
        },
        {
          id: "u7_v2",
          word: "Morning",
          phonetic: "/ˈmɔː.nɪŋ/",
          meaning: "Buổi sáng (từ bình minh đến trưa)",
          example: "I usually exercise in the morning."
        },
        {
          id: "u7_v3",
          word: "Today",
          phonetic: "/təˈdeɪ/",
          meaning: "Hôm nay, ngày hiện tại",
          example: "Today is Monday."
        },
        {
          id: "u7_v4",
          word: "Week",
          phonetic: "/wiːk/",
          meaning: "Tuần lễ (chu kỳ 7 ngày)",
          example: "There are seven days in a week."
        }
      ],
      questions: [
        {
          id: "u7_q1",
          type: "multiple_choice",
          question: "Để hỏi 'Bây giờ là mấy giờ rồi?', câu hỏi chuẩn xác là:",
          options: [
            "What time is it?",
            "How time do you have?",
            "Where is the hour?",
            "Which clock is now?"
          ],
          answer: 0,
          explanation: "'What time is it?' là câu hỏi giờ chuẩn và phổ biến nhất."
        },
        {
          id: "u7_q2",
          type: "multiple_choice",
          question: "Ngày thứ Hai đầu tuần trong tiếng Anh là từ nào?",
          options: ["Sunday", "Monday", "Tuesday", "Friday"],
          answer: 1,
          explanation: "Monday là thứ Hai (Sunday: Chủ Nhật, Tuesday: thứ Ba, Friday: thứ Sáu)."
        },
        {
          id: "u7_q3",
          type: "multiple_choice",
          question: "Điền giới từ đúng: 'The English class starts _____ 7:00 AM.'",
          options: ["in", "on", "at", "for"],
          answer: 2,
          explanation: "Trước mốc thời gian cụ thể (giờ giấc), ta luôn dùng giới từ 'at' (ví dụ: at 7:00 AM)."
        },
        {
          id: "u7_q4",
          type: "multiple_choice",
          question: "'Weekend' trong tiếng Anh nghĩa là gì?",
          options: ["Ngày đầu tuần", "Cuối tuần (Thứ Bảy và Chủ Nhật)", "Giờ nghỉ trưa", "Ngày lễ Tết"],
          answer: 1,
          explanation: "'Weekend' (week + end) nghĩa là kỳ nghỉ cuối tuần."
        }
      ]
    },

    // ─── Unit 8: Trùm Cuối A1: Đại Thử Thách ────────────────────────────────────
    8: {
      title: "Trùm Cuối A1: Đại Thử Thách",
      intro: "Bài thử thách tổng hợp toàn diện kiến thức A1 (từ vựng, phát âm, chào hỏi, số đếm, gia đình, nhà cửa, mua sắm và thời gian) trước khi tiến vào cấp độ A2!",
      vocabulary: [
        {
          id: "u8_v1",
          word: "Champion",
          phonetic: "/ˈtʃæm.pi.ən/",
          meaning: "Nhà vô địch, dũng sĩ chiến thắng",
          example: "You are the champion of Dungeon A1!"
        },
        {
          id: "u8_v2",
          word: "Master",
          phonetic: "/ˈmɑː.stər/",
          meaning: "Làm chủ, nắm vững thành thạo một kỹ năng",
          example: "You have mastered all basic A1 English skills."
        },
        {
          id: "u8_v3",
          word: "Success",
          phonetic: "/səkˈses/",
          meaning: "Thành công, thắng lợi vang dội",
          example: "Hard work brings great success."
        },
        {
          id: "u8_v4",
          word: "Journey",
          phonetic: "/ˈdʒɜː.ni/",
          meaning: "Hành trình phiêu lưu khám phá",
          example: "The journey to A2 begins now!"
        }
      ],
      questions: [
        {
          id: "u8_q1",
          type: "multiple_choice",
          question: "[Tổng hợp] Câu nào sau đây đúng ngữ pháp và ý nghĩa nhất khi tự giới thiệu hoàn chỉnh?",
          options: [
            "Hello, my name is Lan and I am from Vietnam.",
            "Goodbye, name my are Lan and from Vietnam.",
            "Hello, I is name Lan and live on Vietnam.",
            "Good morning, my friend name Lan and from."
          ],
          answer: 0,
          explanation: "'Hello, my name is Lan and I am from Vietnam' là câu chào và giới thiệu bản thân hoàn hảo."
        },
        {
          id: "u8_q2",
          type: "multiple_choice",
          question: "[Tổng hợp] Cặp từ nào sau đây gồm: 1 số đếm và 1 màu sắc?",
          options: [
            "Eight (8) & Blue (Xanh lam)",
            "Father (Bố) & Table (Bàn)",
            "Water (Nước) & Monday (Thứ Hai)",
            "Door (Cửa) & Clock (Đồng hồ)"
          ],
          answer: 0,
          explanation: "Eight là số đếm 8, Blue là màu xanh lam."
        },
        {
          id: "u8_q3",
          type: "multiple_choice",
          question: "[Tổng hợp] Chọn câu nói lịch sự nhất khi muốn mua 2 quả táo trong cửa hàng:",
          options: [
            "Give me two apples fast!",
            "I would like two apples, please.",
            "Apples two money where?",
            "You have two apples no?"
          ],
          answer: 1,
          explanation: "'I would like [món hàng], please' là mẫu câu gọi món/mua hàng chuẩn mực và lịch sự."
        },
        {
          id: "u8_q4",
          type: "multiple_choice",
          question: "[Tổng hợp] Để nói 'Tôi thường gặp gia đình tôi vào cuối tuần', câu nào đúng nhất?",
          options: [
            "I meet my family at the weekend.",
            "I meeting family on Monday morning.",
            "I am family meet the week.",
            "My parents meet clock today."
          ],
          answer: 0,
          explanation: "'I meet my family at the weekend' kết hợp đúng vựng gia đình (family) và thời gian (at the weekend)."
        }
      ]
    }
  }
};

/**
 * Helper to fetch a unit's lesson content safely.
 * Returns null if the quest or unit does not exist.
 */
function getLessonContent(questId, unitId) {
  const qId = Number(questId);
  const uId = Number(unitId);
  return LESSON_CONTENT[qId]?.[uId] || null;
}


module.exports = { LESSON_CONTENT, getLessonContent };
