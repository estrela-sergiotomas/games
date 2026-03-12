import { GAME_CONFIG } from './constants';

export interface RoundResult {
  bet: number;
  crashAt: number;
  cashedAt: number | null;
  profit: number;
}

class GameStateManager {
  private _balance: number = GAME_CONFIG.INITIAL_BALANCE;
  private _rounds: RoundResult[] = [];
  private _crashHistory: number[] = [];

  get balance(): number { return this._balance; }
  get rounds(): RoundResult[] { return this._rounds; }
  get crashHistory(): number[] { return this._crashHistory; }

  deductBet(amount: number): boolean {
    if (amount > this._balance || amount <= 0) return false;
    this._balance -= amount;
    return true;
  }

  addWinnings(amount: number): void {
    this._balance += amount;
  }

  recordRound(result: RoundResult): void {
    this._rounds.push(result);
    this._crashHistory.unshift(result.crashAt);
    if (this._crashHistory.length > 15) this._crashHistory.pop();
  }

  generateCrashPoint(): number {
    const r = Math.random();
    if (r < GAME_CONFIG.INSTANT_CRASH_CHANCE) return 1.00;
    return Math.max(1, Math.floor(((1 - GAME_CONFIG.HOUSE_EDGE) / (1 - r)) * 100) / 100);
  }

  getStats() {
    const total = this._rounds.length;
    const wins = this._rounds.filter(r => r.profit > 0);
    const losses = this._rounds.filter(r => r.profit <= 0);
    const totalProfit = this._rounds.reduce((s, r) => s + r.profit, 0);
    const bigWin = wins.length ? Math.max(...wins.map(r => r.profit)) : 0;
    const bigLoss = losses.length ? Math.min(...losses.map(r => r.profit)) : 0;
    const bestMult = wins.length ? Math.max(...wins.map(r => r.cashedAt ?? 0)) : 0;

    let maxWinStreak = 0, maxLossStreak = 0, curWin = 0, curLoss = 0;
    for (const r of this._rounds) {
      if (r.profit > 0) { curWin++; curLoss = 0; maxWinStreak = Math.max(maxWinStreak, curWin); }
      else { curLoss++; curWin = 0; maxLossStreak = Math.max(maxLossStreak, curLoss); }
    }

    return { total, wins: wins.length, losses: losses.length, totalProfit, bigWin, bigLoss, bestMult, maxWinStreak, maxLossStreak };
  }
}

export const GameState = new GameStateManager();
