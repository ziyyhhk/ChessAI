(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const boardEl = $("board");
  const chess = (typeof Chess !== "undefined") ? new Chess() : null;
  const glyphs = {
    w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
    b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" }
  };
  let selected = null, legalTargets = [], flipped = false, arrows = [], lastMove = null;
  let premoveOn = false, waiting = false, playerColor = "w", moveCounter = 0, toastTimer;
  let arrowStart = null, arrowEnd = null, drawingArrow = false, svgOverlay = null;

  function toast(message) {
    const el = $("toast"); el.textContent = message; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2100);
  }
  function sqName(file, rank) { return "abcdefgh"[file] + (8 - rank); }
  function coords(square) {
    let file = "abcdefgh".indexOf(square[0]), rank = 8 - Number(square[1]);
    if (flipped) { file = 7 - file; rank = 7 - rank; }
    return { file, rank };
  }
  function createBoard() {
    boardEl.innerHTML = "";
    $("rankLabels").innerHTML = "";
    $("fileLabels").innerHTML = "";
    const ranks = flipped ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];
    const files = flipped ? "hgfedcba" : "abcdefgh";
    ranks.forEach(r => { const s = document.createElement("span"); s.textContent = r; $("rankLabels").appendChild(s); });
    files.split("").forEach(f => { const s = document.createElement("span"); s.textContent = f; $("fileLabels").appendChild(s); });
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const realFile = flipped ? 7 - file : file;
        const realRank = flipped ? 7 - rank : rank;
        const squareName = sqName(realFile, realRank);
        const square = document.createElement("button");
        square.type = "button"; square.className = `square ${(rank + file) % 2 ? "dark" : "light"}`;
        square.dataset.square = squareName; square.setAttribute("role", "gridcell");
        square.setAttribute("aria-label", `${squareName}${pieceAt(squareName) ? ", occupied" : ""}`);
        const piece = pieceAt(squareName);
        if (piece) {
          const span = document.createElement("span");
          span.className = `piece ${piece.color === "w" ? "white" : "black"}`;
          span.textContent = glyphs[piece.color][piece.type]; square.appendChild(span);
        }
        if (lastMove && (lastMove.from === squareName || lastMove.to === squareName)) square.classList.add("last-move");
        if (selected === squareName) square.classList.add("selected");
        if (legalTargets.includes(squareName)) {
          square.classList.add("legal");
          if (piece) square.classList.add("has-piece");
        }
        square.addEventListener("click", () => onSquareClick(squareName));
        square.addEventListener("contextmenu", e => e.preventDefault());
        square.addEventListener("pointerdown", e => {
          if (e.button === 2) { e.preventDefault(); drawingArrow = true; arrowStart = squareName; arrowEnd = squareName; }
        });
        square.addEventListener("pointerenter", () => { if (drawingArrow) { arrowEnd = squareName; drawOverlay(); } });
        boardEl.appendChild(square);
      }
    }
    if (!svgOverlay) {
      svgOverlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svgOverlay.classList.add("board-svg"); svgOverlay.setAttribute("viewBox", "0 0 800 800");
      boardEl.appendChild(svgOverlay);
    } else boardEl.appendChild(svgOverlay);
    drawOverlay();
  }
  function pieceAt(square) { return chess ? chess.get(square) : null; }
  function onSquareClick(square) {
    if (!chess || chess.game_over()) return;
    if (waiting && !premoveOn) { toast("Wait for the opponent's move."); return; }
    if (selected && legalTargets.includes(square) && !waiting) {
      const result = makeMove(selected, square);
      if (result) { selected = null; legalTargets = []; render(); afterPlayerMove(); return; }
    }
    const piece = pieceAt(square);
    if (piece && piece.color === playerColor && !waiting) {
      selected = square;
      legalTargets = chess.moves({ square, verbose: true }).map(m => m.to);
    } else if (premoveOn && waiting && selected) {
      toast("Premove queue UI is ready; queued move execution is a next-step feature.");
      selected = null; legalTargets = [];
    } else { selected = null; legalTargets = []; }
    render();
  }
  function makeMove(from, to) {
    try {
      const move = chess.move({ from, to, promotion: "q" });
      if (move) { lastMove = { from: move.from, to: move.to }; moveCounter++; return move; }
    } catch (_) {}
    return null;
  }
  function render() {
    if (!chess) { boardEl.innerHTML = '<p style="padding:20px">Chess rules library failed to load. Check your internet connection and refresh.</p>'; return; }
    createBoard(); renderMoves(); updateStatus();
  }
  function renderMoves() {
    const list = $("moveList"); list.innerHTML = "";
    const history = chess.history();
    if (!history.length) { const li = document.createElement("li"); li.className = "empty-moves"; li.textContent = "Your moves will appear here."; list.appendChild(li); return; }
    for (let i = 0; i < history.length; i += 2) {
      const li = document.createElement("li");
      const number = document.createElement("span"); number.className = "move-number"; number.textContent = `${Math.floor(i / 2) + 1}.`;
      const white = document.createElement("span"); white.textContent = history[i];
      li.append(number, white);
      if (history[i + 1]) { const black = document.createElement("span"); black.textContent = history[i + 1]; li.appendChild(black); }
      list.appendChild(li);
    }
  }
  function updateStatus() {
    if (chess.game_over()) {
      let msg = chess.in_checkmate() ? `Checkmate — ${chess.turn() === "w" ? "Black" : "White"} wins.` : "Game over — draw.";
      $("statusTitle").textContent = chess.in_checkmate() ? "Checkmate" : "Game over";
      $("statusDescription").textContent = msg; $("hintText").textContent = msg; return;
    }
    const isPlayerTurn = chess.turn() === playerColor;
    $("statusTitle").textContent = waiting ? "AI is thinking…" : (chess.in_check() ? "Check!" : (isPlayerTurn ? "Your move" : "Opponent to move"));
    $("turnPiece").textContent = chess.turn() === "w" ? "♙" : "♟";
    $("statusDescription").textContent = waiting ? "Finding a legal move for the selected opponent." : `${chess.turn() === "w" ? "White" : "Black"} to move${chess.in_check() ? " — king is in check." : "."}`;
    $("hintText").textContent = waiting ? "Opponent is thinking…" : "Select a piece, then select its destination.";
  }
  function afterPlayerMove() {
    if (chess.game_over()) { render(); return; }
    waiting = true; render();
    const delay = Number($("paceSelect").value);
    window.setTimeout(() => {
      if (chess.game_over()) { waiting = false; render(); return; }
      const moves = chess.moves();
      if (!moves.length) { waiting = false; render(); return; }
      // Safe starter opponent: a random LEGAL move. Replace this adapter with Stockfish/API providers later.
      const move = moves[Math.floor(Math.random() * moves.length)];
      chess.move(move); lastMove = { from: move.slice(0, 2), to: move.slice(2, 4) };
      waiting = false; selected = null; legalTargets = []; render();
    }, delay);
  }
  function drawOverlay() {
    if (!svgOverlay || !boardEl.clientWidth) return;
    svgOverlay.innerHTML = "";
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
    marker.setAttribute("id", "arrowHead"); marker.setAttribute("markerWidth", "8"); marker.setAttribute("markerHeight", "8");
    marker.setAttribute("refX", "5"); marker.setAttribute("refY", "3"); marker.setAttribute("orient", "auto");
    const head = document.createElementNS("http://www.w3.org/2000/svg", "path");
    head.setAttribute("d", "M0,0 L6,3 L0,6 Z"); head.setAttribute("fill", "#e6c84f");
    marker.appendChild(head); defs.appendChild(marker); svgOverlay.appendChild(defs);
    const draw = (from, to, color = "#e6c84f") => {
      if (!from || !to || from === to) return;
      const a = coords(from), b = coords(to);
      const x1 = a.file * 100 + 50, y1 = a.rank * 100 + 50, x2 = b.file * 100 + 50, y2 = b.rank * 100 + 50;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", x1); line.setAttribute("y1", y1); line.setAttribute("x2", x2); line.setAttribute("y2", y2);
      line.setAttribute("stroke", color); line.setAttribute("stroke-width", "13"); line.setAttribute("stroke-linecap", "round");
      line.setAttribute("opacity", ".8"); line.setAttribute("marker-end", "url(#arrowHead)"); svgOverlay.appendChild(line);
    };
    arrows.forEach(a => draw(a.from, a.to, a.color));
    if (drawingArrow) draw(arrowStart, arrowEnd);
  }
  window.addEventListener("pointerup", e => {
    if (!drawingArrow) return;
    drawingArrow = false;
    if (arrowStart && arrowEnd && arrowStart !== arrowEnd) {
      const existing = arrows.findIndex(a => a.from === arrowStart && a.to === arrowEnd);
      if (existing >= 0) arrows.splice(existing, 1);
      else arrows.push({ from: arrowStart, to: arrowEnd, color: "#e6c84f" });
    }
    arrowStart = arrowEnd = null; drawOverlay();
  });
  $("flipBtn").addEventListener("click", () => { flipped = !flipped; render(); });
  $("clearArrowsBtn").addEventListener("click", () => { arrows = []; drawOverlay(); });
  $("clearMarksBtn").addEventListener("click", () => { arrows = []; selected = null; legalTargets = []; render(); });
  $("newGameBtn").addEventListener("click", () => {
    if (!chess) return;
    chess.reset(); selected = null; legalTargets = []; arrows = []; lastMove = null; waiting = false; moveCounter = 0;
    playerColor = $("sideSelect").value;
    flipped = playerColor === "b"; render();
    if (playerColor === "b") {
      waiting = true; render();
      window.setTimeout(() => {
        const moves = chess.moves(); if (moves.length) { const m = moves[Math.floor(Math.random() * moves.length)]; chess.move(m); lastMove = {from:m.slice(0,2),to:m.slice(2,4)}; }
        waiting = false; render();
      }, Number($("paceSelect").value));
    }
    toast("New game started.");
  });
  $("sideSelect").addEventListener("change", () => toast("Your side applies to the next game."));
  $("engineSelect").addEventListener("change", () => {
    const value = $("engineSelect").value;
    const info = {
      random: ["Demo opponent", "Random legal moves. Works entirely in your browser."],
      stockfish: ["Stockfish", "Engine adapter not connected yet. Planned for a future update."],
      gemini: ["Google Gemini", "Requires a secure backend endpoint and your own API access."],
      custom: ["Custom AI", "Requires a backend endpoint that returns a legal chess move."]
    }[value];
    $("engineName").textContent = info[0]; $("engineDescription").textContent = info[1];
    if (value !== "random") toast("Provider selection is a placeholder in this starter.");
  });
  $("premoveBtn").addEventListener("click", () => {
    premoveOn = !premoveOn; $("premoveBtn").setAttribute("aria-pressed", String(premoveOn));
    $("premoveBtn").textContent = premoveOn ? "⇢ Premove: On" : "⇢ Premove: Off";
    toast(premoveOn ? "Premove mode enabled (queue execution is not implemented yet)." : "Premove mode disabled.");
  });
  $("undoBtn").addEventListener("click", () => {
    if (!chess || waiting) { toast("Wait until the current move finishes."); return; }
    if (chess.history().length) { chess.undo(); if (chess.history().length) chess.undo(); lastMove = null; selected = null; legalTargets = []; render(); toast("Last turn undone."); }
    else toast("There are no moves to undo.");
  });
  $("copyPgnBtn").addEventListener("click", async () => copyText(chess ? chess.pgn() : "", "PGN copied."));
  $("copyFenBtn").addEventListener("click", async () => copyText(chess ? chess.fen() : "", "FEN copied."));
  async function copyText(value, success) {
    try { await navigator.clipboard.writeText(value); toast(success); }
    catch (_) { const area = document.createElement("textarea"); area.value = value; document.body.appendChild(area); area.select(); document.execCommand("copy"); area.remove(); toast(success); }
  }
  if (chess) render();
  else {
    const check = setInterval(() => {
      if (typeof Chess !== "undefined") { clearInterval(check); render(); }
    }, 100);
    setTimeout(() => { clearInterval(check); if (typeof Chess === "undefined") toast("Could not load chess.js. Check your connection and refresh."); }, 7000);
  }
})();
