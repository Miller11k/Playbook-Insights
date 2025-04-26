/**
 * Returns the minimum value in an array of numbers.
 */
export function min(values: number[]): number {
    return Math.min(...values);
}

/**
 * Returns the maximum value in an array of numbers.
 */
export function max(values: number[]): number {
    return Math.max(...values);
}

/**
 * Returns the median of a numeric array.
 */
export function median(values: number[]): number {
    if (values.length === 0) return NaN;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
}

/**
 * Returns the mode (most frequent value) of a numeric array.
 * If multiple values have the same highest frequency, returns the smallest one.
 */
export function mode(values: number[]): number {
    if (values.length === 0) return NaN;

    const freqMap: Record<number, number> = {};
    for (const num of values) {
        freqMap[num] = (freqMap[num] || 0) + 1;
    }

    const maxFreq = Math.max(...Object.values(freqMap));
    const modes = Object.entries(freqMap)
        .filter(([_, freq]) => freq === maxFreq)
        .map(([val]) => Number(val));

    return Math.min(...modes); // break ties by returning smallest mode
}

/**
 * Returns the variance of a numeric array.
 */
export function variance(values: number[]): number {
    if (values.length === 0) return NaN;
    const mean = values.reduce((acc, val) => acc + val, 0) / values.length;
    return values.reduce((acc, val) => acc + (val - mean) ** 2, 0) / values.length;
}

/**
 * Returns the standard deviation of a numeric array.
 */
export function standardDeviation(values: number[]): number {
    const varVal = variance(values);
    return isNaN(varVal) ? NaN : Math.sqrt(varVal);
}