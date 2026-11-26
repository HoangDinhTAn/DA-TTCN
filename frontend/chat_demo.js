const state = {
  balance: 50000000,
  linked: {
    account: "",
    amount: 0,
    message: "",
    sender: "",
    suspicious: false,
  },
  logs: [],
  txHistory: [],
};

function switchView(viewId) {
  document.querySelectorAll(".nav-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === viewId);
  });
  document.querySelectorAll(".view-section").forEach((s) => {
    s.classList.toggle("active", s.id === viewId);
  });

  if (viewId === "view-chat") document.getElementById("badgeChat").classList.add("hidden");
  if (viewId === "view-bank") document.getElementById("badgeBank").classList.add("hidden");
}

document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});

function fmtMoney(n) {
  return `${Number(n || 0).toLocaleString("vi-VN")} VNĐ`;
}

function clockHM() {
  return new Date().toTimeString().slice(0, 5);
}

function normScore(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return n > 0 && n <= 1 ? n * 100 : n;
}

function parseAnalysis(data) {
  const nlp = data.nlp_result || {};
  const gnn = data.gnn_result || {};
  const finalScore = normScore(data.final_risk_score ?? 0);
  const nlpScore = normScore(
    nlp.nlp_risk_score ?? nlp.risk_score ?? nlp.fraud_probability ?? 0
  );
  const gnnScore = normScore(
    gnn.gnn_risk_score ?? gnn.risk_score ?? gnn.fraud_probability ?? 0
  );
  const decision = String(data.decision || "APPROVE").toUpperCase();
  const account =
    data.resolved_account ||
    (Array.isArray(nlp.entities?.extracted_accounts) && nlp.entities.extracted_accounts[0]) ||
    "";
  return { decision, finalScore, nlpScore, gnnScore, account, nlp, gnn };
}

async function postAnalyze(payload) {
  const url = document.getElementById("apiEndpoint").value.trim();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.detail || `HTTP ${res.status}`);
  }
  return json;
}

/* --- CẬP NHẬT SƠ ĐỒ MÔ PHỎNG ĐỒ THỊ GNN --- */
function updateGraphPreview(stk, gnnScore = null, decision = null) {
  const dstStkEl = document.getElementById("graphDstStk");
  const dstNodeEl = document.getElementById("graphDstNode");
  const peerLabelEl = document.getElementById("graphPeerLabel");
  const badgeEl = document.getElementById("gnnGraphBadge");
  const metaEl = document.getElementById("gnnGraphMeta");

  const cleanStk = (stk || "").trim();
  dstStkEl.textContent = cleanStk || "--------";
  dstNodeEl.classList.remove("high-risk", "safe-node");

  if (!cleanStk) {
    peerLabelEl.textContent = "Chưa quét";
    badgeEl.textContent = "Chờ STK";
    metaEl.textContent = "Nhập hoặc chọn STK để xem mức độ kết nối đồ thị.";
    return;
  }

  if (gnnScore === null) {
    peerLabelEl.textContent = "Đang chờ chấm";
    badgeEl.textContent = "Sẵn sàng quét";
    metaEl.textContent = `Đã gắn nút đích ${cleanStk}. Bấm "Xác thực GNN & Chuyển tiền" để chấm đồ thị.`;
    return;
  }

  const isRisk = decision === "BLOCK" || decision === "REVIEW" || gnnScore >= 50;
  if (isRisk) {
    dstNodeEl.classList.add("high-risk");
    peerLabelEl.textContent = "Cụm nghi vấn";
    badgeEl.textContent = `Rủi ro ${gnnScore.toFixed(1)}`;
    metaEl.textContent = `Nút ${cleanStk} có điểm GNN ${gnnScore.toFixed(
      1
    )} với các liên kết giao dịch bất thường.`;
  } else {
    dstNodeEl.classList.add("safe-node");
    peerLabelEl.textContent = "Cụm tin cậy";
    badgeEl.textContent = `An toàn ${gnnScore.toFixed(1)}`;
    metaEl.textContent = `Nút ${cleanStk} có điểm GNN ${gnnScore.toFixed(
      1
    )}, mạng lưới giao dịch bình thường.`;
  }
}

/* --- ĐỌC SỐ TIỀN THÀNH CHỮ --- */
function toVietnameseWords(num) {
  const n = Math.floor(Number(num) || 0);
  if (n <= 0) return "Không đồng";
  if (n >= 1000000000) {
    return `${(n / 1000000000).toLocaleString("vi-VN")} tỷ đồng`;
  }
  if (n >= 1000000) {
    const trieu = Math.floor(n / 1000000);
    const le = Math.floor((n % 1000000) / 1000);
    return le > 0 ? `${trieu} triệu ${le} nghìn đồng` : `${trieu} triệu đồng`;
  }
  if (n >= 1000) {
    return `${Math.floor(n / 1000)} nghìn đồng`;
  }
  return `${n} đồng`;
}

function refreshAmountHint() {
  const amt = Math.max(0, Number(document.getElementById("txAmount").value) || 0);
  document.getElementById("amountWordsHint").textContent = `Bằng chữ: ${toVietnameseWords(amt)}`;
}

function syncExtractedAccount({ account, amount, message, sender, suspicious }) {
  state.linked = { account, amount, message, sender, suspicious };
  if (!account) return;

  document.getElementById("txAccount").value = account;
  if (amount > 0) {
    document.getElementById("txAmount").value = amount;
    refreshAmountHint();
  }
  document.getElementById("txNote").value = `Chuyen khoan cho ${sender || "nguoi nhan"}`;

  document.getElementById("bridgeStkValue").textContent = account;
  document.getElementById("stkBridgeCard").classList.remove("hidden");

  const bankBox = document.getElementById("bankLinkedBox");
  bankBox.classList.remove("empty");
  bankBox.innerHTML = `
    <div><strong>STK từ Chat:</strong> <span class="mono">${account}</span></div>
    <div><strong>Người gửi:</strong> ${sender || "Không rõ"}</div>
    <div><strong>Ngữ cảnh NLP:</strong> ${
      suspicious
        ? '<span style="color:#fda4af;font-weight:700;">Nghi ngờ lừa đảo</span>'
        : '<span style="color:#6ee7b7;">Bình thường</span>'
    }</div>
    <div style="margin-top:4px;color:#9aa7b8;">“${message}”</div>
  `;
  document.getElementById("badgeBank").classList.remove("hidden");
  updateGraphPreview(account);
}

function updateAuditBoard(sourceLabel, payload, data) {
  const { decision, finalScore, nlpScore, gnnScore, account, nlp, gnn } = parseAnalysis(data);

  const decEl = document.getElementById("metricDecision");
  decEl.textContent = decision;
  decEl.style.color =
    decision === "BLOCK" ? "#fda4af" : decision === "REVIEW" ? "#f59e0b" : "#6ee7b7";

  document.getElementById("metricSource").textContent = `${sourceLabel} • ${clockHM()}`;
  document.getElementById("metricFinal").textContent = finalScore.toFixed(2);
  document.getElementById("metricNlp").textContent = nlpScore.toFixed(2);
  document.getElementById("metricGnn").textContent = gnnScore.toFixed(2);

  document.getElementById("meterFinal").style.width = `${Math.min(100, finalScore)}%`;
  document.getElementById("meterNlp").style.width = `${Math.min(100, nlpScore)}%`;
  document.getElementById("meterGnn").style.width = `${Math.min(100, gnnScore)}%`;

  const entities = nlp.entities || {};
  document.getElementById("specNlpList").innerHTML = `
    <div class="kv-item"><span class="kv-k">Văn bản đầu vào</span><span class="kv-v">${
      payload.message || "-"
    }</span></div>
    <div class="kv-item"><span class="kv-k">Điểm NLP</span><span class="kv-v mono">${nlpScore.toFixed(
      2
    )}</span></div>
    <div class="kv-item"><span class="kv-k">STK bóc tách</span><span class="kv-v mono">${
      (entities.extracted_accounts || []).join(", ") || "Không có"
    }</span></div>
    <div class="kv-item"><span class="kv-k">SĐT / URL</span><span class="kv-v">${
      [...(entities.extracted_phones || []), ...(entities.extracted_urls || [])].join(", ") ||
      "Không có"
    }</span></div>
  `;

  document.getElementById("specGnnList").innerHTML = `
    <div class="kv-item"><span class="kv-k">STK kiểm tra</span><span class="kv-v mono">${
      account || payload.account_number || "Chưa có STK"
    }</span></div>
    <div class="kv-item"><span class="kv-k">Điểm GNN</span><span class="kv-v mono">${gnnScore.toFixed(
      2
    )}</span></div>
    <div class="kv-item"><span class="kv-k">Trạng thái đồ thị</span><span class="kv-v">${
      gnn.found_in_db === false
        ? "Ngoài tập tài khoản mẫu"
        : gnn.risk_level || gnn.label || "Đã đánh giá đồ thị"
    }</span></div>
    <div class="kv-item"><span class="kv-k">Kết luận</span><span class="kv-v">${
      data.summary_message || decision
    }</span></div>
  `;

  document.getElementById("auditJsonView").textContent = JSON.stringify(data, null, 2);

  state.logs.unshift({
    time: clockHM(),
    source: sourceLabel,
    account: account || payload.account_number || "-",
    amount: payload.amount || 0,
    nlp: nlpScore.toFixed(1),
    gnn: gnnScore.toFixed(1),
    total: finalScore.toFixed(1),
    decision,
  });

  document.getElementById("auditTableBody").innerHTML = state.logs
    .map(
      (r) => `
      <tr>
        <td class="mono">${r.time}</td>
        <td>${r.source}</td>
        <td class="mono"><strong>${r.account}</strong></td>
        <td>${fmtMoney(r.amount)}</td>
        <td class="mono">${r.nlp}</td>
        <td class="mono">${r.gnn}</td>
        <td class="mono"><strong>${r.total}</strong></td>
        <td><span class="dec-badge ${r.decision}">${r.decision}</span></td>
      </tr>
    `
    )
    .join("");
}

document.getElementById("btnClearAudit").addEventListener("click", () => {
  state.logs = [];
  document.getElementById("auditTableBody").innerHTML = `
    <tr><td colspan="8" class="tbl-empty">Chưa có bản ghi nào trong phiên này.</td></tr>
  `;
});

/* --- CHAT DEMO LOGIC --- */
const SEED_MESSAGES = [
  { side: "in", sender: "Mẹ", text: "Chiều nay con có về ăn cơm sớm không hay ăn ở trường?", time: "16:20" },
  { side: "out", sender: "Con", text: "Dạ khoảng 6h kém con về tới nhà mẹ ơi, mẹ nấu gì đấy ạ?", time: "16:22" },
  { side: "in", sender: "Mẹ", text: "Mẹ kho thịt ba chỉ với luộc rau muống, nhớ ghé mua thêm ít trái cây nhé.", time: "16:23" },
  { side: "out", sender: "Con", text: "Vâng mẹ, lát trên đường về con mua luôn.", time: "16:24" },
];

const SAMPLE_CASES = {
  mom: {
    sender: "Mẹ",
    message: "Tí nữa đi làm về nhớ mang theo chìa khóa cổng nhé, mẹ ra ngoài có việc chút.",
    account: "",
    amount: 0,
  },
  friend: {
    sender: "Minh",
    message: "5h30 chiều nay ra sân bóng đầu khu nhé, thiếu đúng 1 người.",
    account: "",
    amount: 0,
  },
  scamFamily: {
    sender: "Con gái",
    message:
      "Mẹ ơi con cần tiền gấp để đóng tiền học, mẹ chuyển cho con 10 tr nhé, mà tài khoản con bị bảo trì mẹ chuyển vô tài khoản bạn con nhé, Ngân hàng VietinBank Stk là 76884932774",
    account: "",
    amount: 10000000,
  },
  scamPolice: {
    sender: "Số lạ (Tự xưng Công an)",
    message:
      "Cơ quan điều tra thông báo tài khoản của bạn liên quan đường dây rửa tiền, chuyển gấp 20 triệu vào STK 99998888 để xác minh ngay.",
    account: "",
    amount: 20000000,
  },
};

const chatThread = document.getElementById("chatThread");
const scamTopBanner = document.getElementById("scamTopBanner");

document.getElementById("btnHideBanner").addEventListener("click", () => {
  scamTopBanner.classList.add("hidden");
});

function addBubble({ side, sender, text, time }) {
  const row = document.createElement("div");
  row.className = `msg-row ${side}`;

  const who = document.createElement("div");
  who.className = "msg-who";
  who.textContent = sender;

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.textContent = text;

  const stamp = document.createElement("div");
  stamp.className = "msg-time";
  stamp.textContent = time;

  row.appendChild(who);
  row.appendChild(bubble);
  row.appendChild(stamp);

  chatThread.appendChild(row);
  chatThread.scrollTop = chatThread.scrollHeight;
  return { row, stamp };
}

function resetThread() {
  chatThread.innerHTML = `<div class="day-divider">Hôm nay</div>`;
  SEED_MESSAGES.forEach(addBubble);
  scamTopBanner.classList.add("hidden");
  document.getElementById("chatErrorBox").classList.add("hidden");
}

document.getElementById("btnResetThread").addEventListener("click", resetThread);

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const c = SAMPLE_CASES[chip.dataset.sample];
    if (!c) return;
    document.getElementById("chatSender").value = c.sender;
    document.getElementById("chatMessage").value = c.message;
    document.getElementById("chatAccount").value = c.account;
    document.getElementById("chatAmount").value = c.amount;
    document.getElementById("chatErrorBox").classList.add("hidden");
  });
});

async function sendIncomingMessage() {
  const errBox = document.getElementById("chatErrorBox");
  errBox.classList.add("hidden");

  const sender = document.getElementById("chatSender").value.trim() || "Tin nhắn đến";
  const message = document.getElementById("chatMessage").value.trim();
  const account_number = document.getElementById("chatAccount").value.trim();
  const amount = Math.max(0, Number(document.getElementById("chatAmount").value) || 0);

  if (!message) {
    errBox.textContent = "Vui lòng nhập nội dung tin nhắn đến.";
    errBox.classList.remove("hidden");
    return;
  }

  const { row, stamp } = addBubble({ side: "in", sender, text: message, time: clockHM() });
  document.getElementById("chatMessage").value = "";

  const btn = document.getElementById("btnSendIncoming");
  btn.disabled = true;
  try {
    const payload = { message, account_number, amount };
    const data = await postAnalyze(payload);
    updateAuditBoard("Hội thoại NLP", payload, data);

    const { decision, finalScore, account } = parseAnalysis(data);
    const suspicious = decision === "BLOCK" || decision === "REVIEW" || finalScore >= 50;

    if (account) {
      syncExtractedAccount({ account, amount, message, sender, suspicious });
    }

    if (!suspicious) return;

    row.classList.add("flagged");
    const alertCard = document.createElement("div");
    alertCard.className = `msg-alert-card ${decision === "REVIEW" ? "review" : ""}`;
    const reason =
      data.summary_message ||
      "Tin nhắn có dấu hiệu lừa đảo, hãy cẩn trọng trước khi chuyển tiền.";
    alertCard.innerHTML = `<div><strong>Cảnh báo dấu hiệu lừa đảo (Rủi ro: ${finalScore.toFixed(
      1
    )}):</strong> ${reason}</div>`;

    if (account) {
      const goBtn = document.createElement("button");
      goBtn.type = "button";
      goBtn.className = "btn-check-gnn";
      goBtn.textContent = `Kiểm tra STK ${account} tại Chuyển khoản (GNN) →`;
      goBtn.addEventListener("click", () => switchView("view-bank"));
      alertCard.appendChild(goBtn);
    }

    row.insertBefore(alertCard, stamp);
    document.getElementById("scamTopMessage").textContent =
      `Cảnh báo dấu hiệu lừa đảo từ "${sender}": ${reason}`;
    scamTopBanner.classList.remove("hidden");
    chatThread.scrollTop = chatThread.scrollHeight;
  } catch (err) {
    errBox.textContent = `Lỗi gọi API: ${err.message}`;
    errBox.classList.remove("hidden");
  } finally {
    btn.disabled = false;
  }
}

document.getElementById("btnSendIncoming").addEventListener("click", sendIncomingMessage);
document.getElementById("chatMessage").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendIncomingMessage();
  }
});

function sendUserReply() {
  const box = document.getElementById("replyBox");
  const text = box.value.trim();
  if (!text) return;
  addBubble({ side: "out", sender: "Bạn", text, time: clockHM() });
  box.value = "";
}

document.getElementById("btnSendReply").addEventListener("click", sendUserReply);
document.getElementById("replyBox").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendUserReply();
  }
});

/* --- BANK GNN LOGIC --- */
function appendBankTxRecord({ bankCode, account, amount, status, decision }) {
  state.txHistory.unshift({
    time: clockHM(),
    bankCode,
    account,
    amount,
    status,
    decision,
  });

  document.getElementById("txCountBadge").textContent = `${state.txHistory.length} giao dịch`;
  document.getElementById("bankTxHistoryList").innerHTML = state.txHistory
    .map(
      (tx) => `
      <div class="tx-item-row">
        <div class="tx-item-left">
          <strong class="mono">${tx.bankCode} • ${tx.account}</strong>
          <span>Lúc ${tx.time} • ${tx.status}</span>
        </div>
        <div class="tx-item-right">
          <span class="tx-item-amt mono">${fmtMoney(tx.amount)}</span>
          <span class="dec-badge ${tx.decision}">${tx.decision}</span>
        </div>
      </div>
    `
    )
    .join("");
}

document.querySelectorAll(".amt-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.getElementById("txAmount").value = chip.dataset.amt;
    refreshAmountHint();
  });
});

document.getElementById("txAmount").addEventListener("input", refreshAmountHint);
document.getElementById("txAccount").addEventListener("input", (e) => {
  updateGraphPreview(e.target.value);
});

document.querySelectorAll(".acc-btn").forEach((item) => {
  item.addEventListener("click", () => {
    const mode = item.dataset.bankCase;
    if (mode === "fraud") {
      document.getElementById("txBank").value = "MB";
      document.getElementById("txAccount").value = "99998888";
      document.getElementById("txAmount").value = 15000000;
      document.getElementById("txNote").value = "Chuyen tien xac minh";
      state.linked = { account: "", amount: 0, message: "", sender: "", suspicious: false };
    } else if (mode === "clean") {
      document.getElementById("txBank").value = "VCB";
      document.getElementById("txAccount").value = "10000001";
      document.getElementById("txAmount").value = 250000;
      document.getElementById("txNote").value = "Tien an trua";
      state.linked = { account: "", amount: 0, message: "", sender: "", suspicious: false };
    } else {
      document.getElementById("txBank").value = "ICB";
      document.getElementById("txAccount").value = "76884932774";
      document.getElementById("txAmount").value = 10000000;
      document.getElementById("txNote").value = "Chuyen tien dong hoc phi";
    }
    refreshAmountHint();
    updateGraphPreview(document.getElementById("txAccount").value);
  });
});

document.getElementById("btnCloseReceipt").addEventListener("click", () => {
  document.getElementById("txResultModal").classList.add("hidden");
});

document.getElementById("bankForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const bankCode = document.getElementById("txBank").value;
  const account_number = document.getElementById("txAccount").value.trim();
  const amount = Math.max(0, Number(document.getElementById("txAmount").value) || 0);
  const note = document.getElementById("txNote").value.trim();
  if (!account_number) return;

  const useLinkedMsg =
    state.linked.account && state.linked.account === account_number && state.linked.message;
  const message = useLinkedMsg ? state.linked.message : note || "Giao dich chuyen khoan";

  const btn = document.getElementById("btnBankSubmit");
  btn.disabled = true;
  btn.textContent = "Đang truy vết đồ thị GNN...";

  try {
    const payload = { message, account_number, amount };
    const data = await postAnalyze(payload);
    updateAuditBoard("Chuyển khoản GNN", payload, data);

    const { decision, finalScore, nlpScore, gnnScore } = parseAnalysis(data);
    updateGraphPreview(account_number, gnnScore, decision);

    const blocked = decision === "BLOCK" || decision === "REVIEW" || finalScore >= 50;

    const card = document.getElementById("txReceiptCard");
    const icon = document.getElementById("txReceiptIcon");
    const title = document.getElementById("txReceiptTitle");
    const desc = document.getElementById("txReceiptDesc");

    card.classList.remove("blocked", "approved");
    if (blocked) {
      card.classList.add("blocked");
      icon.textContent = "✕";
      title.textContent =
        decision === "BLOCK"
          ? "GIAO DỊCH BỊ CHẶN DO RỦI RO LỪA ĐẢO"
          : "TẠM DỪNG GIAO DỊCH ĐỂ CẢNH BÁO";
      desc.textContent =
        data.summary_message ||
        "Hệ thống GNN & NLP ghi nhận dấu hiệu bất thường trên tài khoản nhận. Giao dịch đã bị chặn để bảo vệ tài khoản.";
      appendBankTxRecord({
        bankCode,
        account: account_number,
        amount,
        status: "Đã chặn bởi GNN",
        decision,
      });
    } else {
      state.balance = Math.max(0, state.balance - amount);
      document.getElementById("walletBalanceText").textContent = fmtMoney(state.balance);
      card.classList.add("approved");
      icon.textContent = "✓";
      title.textContent = "CHUYỂN TIỀN THÀNH CÔNG";
      desc.textContent = `Đã chuyển ${fmtMoney(
        amount
      )} tới ${bankCode} • ${account_number}. Giao dịch được xác thực an toàn.`;
      appendBankTxRecord({
        bankCode,
        account: account_number,
        amount,
        status: "Hoàn tất chuyển tiền",
        decision,
      });
    }

    document.getElementById("txReceiptDetails").innerHTML = `
      <div><strong>Ngân hàng &amp; STK:</strong> <span class="mono">${bankCode} • ${account_number}</span></div>
      <div><strong>Số tiền:</strong> ${fmtMoney(amount)}</div>
      <div><strong>Quyết định:</strong> <span class="mono">${decision}</span> (Tổng: ${finalScore.toFixed(
      1
    )} • NLP: ${nlpScore.toFixed(1)} • GNN: ${gnnScore.toFixed(1)})</div>
    `;
    document.getElementById("txResultModal").classList.remove("hidden");
  } catch (err) {
    alert(`Lỗi kết nối Backend: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = "Xác thực GNN & Chuyển tiền";
  }
});

resetThread();
refreshAmountHint();