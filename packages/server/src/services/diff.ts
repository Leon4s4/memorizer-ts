/**
 * Text Diff Service
 *
 * Provides line-by-line text comparison functionality
 */

import { singleton, injectable } from 'tsyringe';

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber?: number;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffResult {
  lines: DiffLine[];
  stats: {
    added: number;
    removed: number;
    unchanged: number;
  };
}

@singleton()
@injectable()
export class DiffService {
  /**
   * Generate a diff between two texts
   */
  diff(oldText: string, newText: string): DiffResult {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');

    const diffLines = this.computeDiff(oldLines, newLines);

    const stats = {
      added: diffLines.filter((l) => l.type === 'added').length,
      removed: diffLines.filter((l) => l.type === 'removed').length,
      unchanged: diffLines.filter((l) => l.type === 'unchanged').length,
    };

    return {
      lines: diffLines,
      stats,
    };
  }

  /**
   * Compute line-by-line diff using a simple LCS-based algorithm
   */
  private computeDiff(oldLines: string[], newLines: string[]): DiffLine[] {
    const lcs = this.longestCommonSubsequence(oldLines, newLines);
    const result: DiffLine[] = [];

    let oldIndex = 0;
    let newIndex = 0;
    let oldLineNum = 1;
    let newLineNum = 1;

    for (const commonLine of lcs) {
      // Add removed lines
      while (oldIndex < oldLines.length && oldLines[oldIndex] !== commonLine) {
        result.push({
          type: 'removed',
          content: oldLines[oldIndex],
          oldLineNumber: oldLineNum,
        });
        oldIndex++;
        oldLineNum++;
      }

      // Add added lines
      while (newIndex < newLines.length && newLines[newIndex] !== commonLine) {
        result.push({
          type: 'added',
          content: newLines[newIndex],
          newLineNumber: newLineNum,
        });
        newIndex++;
        newLineNum++;
      }

      // Add unchanged line
      if (oldIndex < oldLines.length && newIndex < newLines.length) {
        result.push({
          type: 'unchanged',
          content: commonLine,
          oldLineNumber: oldLineNum,
          newLineNumber: newLineNum,
        });
        oldIndex++;
        newIndex++;
        oldLineNum++;
        newLineNum++;
      }
    }

    // Add remaining removed lines
    while (oldIndex < oldLines.length) {
      result.push({
        type: 'removed',
        content: oldLines[oldIndex],
        oldLineNumber: oldLineNum,
      });
      oldIndex++;
      oldLineNum++;
    }

    // Add remaining added lines
    while (newIndex < newLines.length) {
      result.push({
        type: 'added',
        content: newLines[newIndex],
        newLineNumber: newLineNum,
      });
      newIndex++;
      newLineNum++;
    }

    return result;
  }

  /**
   * Find the longest common subsequence between two arrays of strings
   */
  private longestCommonSubsequence(arr1: string[], arr2: string[]): string[] {
    const m = arr1.length;
    const n = arr2.length;

    // Create LCS table
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    // Fill LCS table
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (arr1[i - 1] === arr2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // Backtrack to find LCS
    const lcs: string[] = [];
    let i = m;
    let j = n;

    while (i > 0 && j > 0) {
      if (arr1[i - 1] === arr2[j - 1]) {
        lcs.unshift(arr1[i - 1]);
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    return lcs;
  }

  /**
   * Generate a unified diff format
   */
  unifiedDiff(oldText: string, newText: string, context: number = 3): string {
    const diff = this.diff(oldText, newText);
    const lines: string[] = [];

    lines.push(`--- old`);
    lines.push(`+++ new`);

    let i = 0;
    while (i < diff.lines.length) {
      // Find next changed line
      while (i < diff.lines.length && diff.lines[i].type === 'unchanged') {
        i++;
      }

      if (i >= diff.lines.length) break;

      // Find hunk boundaries (including context)
      const hunkStart = Math.max(0, i - context);
      let hunkEnd = i;

      // Find end of changes in this hunk
      while (
        hunkEnd < diff.lines.length &&
        (diff.lines[hunkEnd].type !== 'unchanged' ||
          (hunkEnd < diff.lines.length - 1 &&
            diff.lines[hunkEnd + 1].type !== 'unchanged'))
      ) {
        hunkEnd++;
      }

      hunkEnd = Math.min(diff.lines.length, hunkEnd + context);

      // Generate hunk header
      const oldStart = diff.lines[hunkStart].oldLineNumber || 1;
      const newStart = diff.lines[hunkStart].newLineNumber || 1;
      const oldCount = hunkEnd - hunkStart;
      const newCount = hunkEnd - hunkStart;

      lines.push(`@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`);

      // Add hunk lines
      for (let j = hunkStart; j < hunkEnd; j++) {
        const line = diff.lines[j];
        const prefix = line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ';
        lines.push(`${prefix}${line.content}`);
      }

      i = hunkEnd;
    }

    return lines.join('\n');
  }
}
