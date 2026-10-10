# ChessAI

A public, browser-based chess UI starter with legal moves, move history, board flipping, arrow annotations, and an initial local demo opponent.

## Current status

This is an early UI starter, not a finished chess platform.

### Included
- Responsive dark chess UI
- Legal move validation powered by `chess.js`
- Board flip and promotion to queen
- Move history, PGN copy, and FEN copy
- Right-drag arrow annotations
- Basic random-legal-move demo opponent
- Provider selector placeholders for Stockfish, Gemini, and custom endpoints

### Not implemented yet
- True premove queue/execution
- Stockfish engine integration
- Gemini / other AI provider backend
- Accounts, online multiplayer, cloud saves, clocks, and full analysis

## Run locally

You can open `index.html` directly in a browser, but using a local server is more reliable:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

The chess rules library is loaded from a CDN, so the first run needs an internet connection.

## Publish on GitHub Pages

1. Create a **public** repository named `ChessAI` on GitHub.
2. Upload the contents of this folder to the repository root. Make sure `index.html` is at the root, not inside an extra nested `ChessAI/` folder.
3. On GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch `main` and folder `/(root)`, then click **Save**.
6. Wait for the Pages deployment to finish. The site URL will appear on the Pages settings screen, typically `https://YOUR-USERNAME.github.io/ChessAI/`.

## AI integration and API key safety

GitHub Pages is static hosting. **Do not place provider API keys in `app.js`, HTML, or any other public file.** Anyone can inspect public website source and steal exposed keys.

A safer architecture is:

```text
Chessboard in browser
       |
       | FEN + move history
       v
Your backend / serverless function
       |
       +--> Stockfish engine
       +--> Gemini API
       +--> Other AI provider APIs
       |
       v
Return a proposed move (UCI or SAN)
       |
       v
Validate move with chess.js before applying
```

For Gemini, use the model ID currently listed in Google's official API documentation, and keep the API key in backend environment variables. Model IDs and free quotas can change; check the provider's current terms before enabling a model.

Official Gemini model list: https://ai.google.dev/gemini-api/docs/models

## Suggested roadmap

1. Finish premove queue and move cancellation.
2. Add Stockfish WebAssembly for a real local chess engine.
3. Define a provider adapter contract, e.g. `getMove({ fen, history, model })`.
4. Add a secure backend endpoint for Gemini and other hosted models.
5. Validate every AI response as a legal move; handle malformed responses and rate limits.
6. Add time controls, evaluation bar, settings, and accessibility improvements.

## License

Choose a license before accepting contributions. MIT is a common permissive option, but select the license that fits your project.
