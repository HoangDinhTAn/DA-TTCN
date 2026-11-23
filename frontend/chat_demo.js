const INITIAL_CONVERSATION = [
  {
    side: "in",
    sender: "Mẹ",
    text: "Chiều nay con có về ăn cơm sớm không hay ăn ở trường?",
    time: "16:20",
  },
  {
    side: "out",
    sender: "Con",
    text: "Dạ khoảng 6h kém con về tới nhà mẹ ơi, mẹ nấu gì đấy ạ?",
    time: "16:22",
  },
  {
    side: "in",
    sender: "Mẹ",
    text: "Mẹ kho thịt ba chỉ với luộc rau muống, nhớ ghé mua thêm ít trái cây nhé.",
    time: "16:23",
  },
  {
    side: "out",
    sender: "Con",
    text: "Vâng mẹ, lát trên đường về con mua luôn.",
    time: "16:24",
  },
];

const QUICK_CASES = {
  mom1: {
    sender: "Mẹ",
    message: "Tí nữa đi làm về nhớ mang theo chìa khóa cổng nhé, mẹ ra ngoài có việc chút.",
    account: "",
    amount: 0,
  },
  friend1: {
    sender: "Minh",
    message: "Tối nay rảnh không, ra quán cà phê đầu ngõ ngồi tí cho mát?",
    account: "",
    amount: 0,
  },
  scam: {
    sender: "Số lạ",
    message:
      "Cảnh sát thông báo tài khoản ngân hàng của bạn đang bị điều tra, chuyển gấp 20 triệu vào STK 99998888 để xác minh ngay.",
    account: "",
    amount: 20000000,
  },
};

const messageList = document.getElementById("messageList");
const simApiUrl = document.getElementById("simApiUrl");
const simSender = document.getElementById("simSender");
const simMessage = document.getElementById("simMessage");
const simAccount = document.getElementById("simAccount");
const simAmount = document.getElementById("simAmount");
const sendIncomingBtn = document.getElementById("sendIncomingBtn");
const simError = document.getElementById("simError");

const scamTopBanner = document.getElementById("scamTopBanner");
const scamTopText = document.getElementById("scamTopText");
const closeBannerBtn = document.getElementById("closeBannerBtn");

const replyInput = document.getElementById("replyInput");
const sendReplyBtn = document.getElementById("sendReplyBtn");
const resetChatBtn = document.getElementById("resetChatBtn");

function currentTime() {
  return new Date().toTimeString().slice(0, 5);
}

function showSimError(msg) {
  simError.textContent = msg;
  simError.classList.remove("hidden");
}

function hideSimError() {
  simError.textContent = "";
  simError.classList.add("hidden");
}

function showTopScamAlert(sender, reasonText) {
  scamTopText.textContent = `Cảnh báo lừa đảo từ "${sender}": ${reasonText}`;
  scamTopBanner.classList.remove("hidden");
}

closeBannerBtn.addEventListener("click", () => {
  scamTopBanner.classList.add("hidden");
});

function appendBubble({ side, sender, text, time }) {
  const item = document.createElement("div");
  item.className = `msg-item ${side}`;

  const senderEl = document.createElement("div");
  senderEl.className = "msg-sender";
  senderEl.textContent = sender;

  const bubbleEl = document.createElement("div");
  bubbleEl.className = "bubble";
  bubbleEl.textContent = text;

  const timeEl = document.createElement("div");
  timeEl.className = "msg-time";
  timeEl.textContent = time;

  item.appendChild(senderEl);
  item.appendChild(bubbleEl);
  item.appendChild(timeEl);

  messageList.appendChild(item);
  messageList.scrollTop = messageList.scrollHeight;

  return { item, timeEl };
}

function renderSeedConversation() {
  messageList.innerHTML = `<div class="day-tag">Hôm nay</div>`;
  INITIAL_CONVERSATION.forEach((msg) => appendBubble(msg));
  scamTopBanner.classList.add("hidden");
  hideSimError();
}

function isScamResponse(data) {
  const decision = String(data.decision || "").toUpperCase();
  if (decision === "APPROVE" || decision === "SAFE" || decision === "ALLOW") {
    return { flagged: false, level: "block", decision };
  }

  const nlp = data.nlp_result || {};
  const rawScore =
    typeof data.final_risk_score === "number"
      ? data.final_risk_score
      : Number(nlp.nlp_risk_score ?? nlp.risk_score ?? 0);
  const score100 = rawScore > 0 && rawScore <= 1 ? rawScore * 100 : rawScore;

  const flagged =
    decision === "BLOCK" ||
    decision === "REVIEW" ||
    Boolean(nlp.is_scam) ||
    score100 >= 50;

  const level = decision === "BLOCK" || score100 >= 75 ? "block" : "review";
  return { flagged, level, decision: decision || "REVIEW", score: score100 };
}

function attachScamWarning(item, timeEl, sender, data) {
  const check = isScamResponse(data);
  if (!check.flagged) {
    // Tin nhắn bình thường: không gắn nhãn hay cảnh báo gì thêm
    return;
  }

  item.classList.add("flagged");

  const note = document.createElement("div");
  note.className = `scam-note ${check.level === "review" ? "review-tone" : ""}`;

  const scorePart =
    typeof check.score === "number" && Number.isFinite(check.score)
      ? ` (Rủi ro: ${check.score.toFixed(1)})`
      : "";
  const detailText =
    data.summary_message ||
    data.nlp_result?.reason ||
    "Tin nhắn có dấu hiệu lừa đảo, hãy cẩn trọng trước khi chuyển tiền hoặc cung cấp thông tin.";

  note.textContent = `Cảnh báo dấu hiệu lừa đảo${scorePart}: ${detailText}`;
  item.insertBefore(note, timeEl);

  showTopScamAlert(sender, detailText);
  messageList.scrollTop = messageList.scrollHeight;
}

async function handleIncomingSend() {
  hideSimError();
  const apiUrl = simApiUrl.value.trim();
  const sender = simSender.value.trim() || "Tin nhắn đến";
  const message = simMessage.value.trim();
  const accountNumber = simAccount.value.trim();
  const amount = Math.max(0, Number(simAmount.value) || 0);

  if (!apiUrl) {
    showSimError("Chưa có địa chỉ API Backend.");
    return;
  }
  if (!message) {
    showSimError("Hãy nhập nội dung tin nhắn đến trước khi gửi.");
    return;
  }

  const { item, timeEl } = appendBubble({
    side: "in",
    sender,
    text: message,
    time: currentTime(),
  });
  simMessage.value = "";

  sendIncomingBtn.disabled = true;
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        account_number: accountNumber,
        amount,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || `HTTP ${res.status}`);
    }

    attachScamWarning(item, timeEl, sender, data);
  } catch (err) {
    showSimError(`Không chấm điểm được tin nhắn: ${err.message}`);
  } finally {
    sendIncomingBtn.disabled = false;
  }
}

document.querySelectorAll(".pill").forEach((btn) => {
  btn.addEventListener("click", () => {
    const c = QUICK_CASES[btn.dataset.case];
    if (!c) return;
    simSender.value = c.sender;
    simMessage.value = c.message;
    simAccount.value = c.account;
    simAmount.value = c.amount;
    hideSimError();
  });
});

sendIncomingBtn.addEventListener("click", handleIncomingSend);
simMessage.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleIncomingSend();
  }
});

function handleReplySend() {
  const text = replyInput.value.trim();
  if (!text) return;
  appendBubble({
    side: "out",
    sender: "Bạn",
    text,
    time: currentTime(),
  });
  replyInput.value = "";
}

sendReplyBtn.addEventListener("click", handleReplySend);
replyInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleReplySend();
  }
});

resetChatBtn.addEventListener("click", renderSeedConversation);

renderSeedConversation();