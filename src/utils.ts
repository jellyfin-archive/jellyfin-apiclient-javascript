/**
 * Raises an error with the specified message, if the value is falsy
 */
export function nf(value: any, msg: string): void | never {
    if (!value) {
        throw new Error(msg);
    }
}

type NeverNull<T> = T extends null
    ? never
    : T extends undefined
    ? never
    : undefined;

/**
 * Helper for "variable x should not be null or undefined"
 */
export function snbn<T>(name: string, value: T): NeverNull<T> {
    if (value === null || value === undefined) {
        throw new Error(`${name} should not be null or undefined`);
    }
    return undefined as NeverNull<T>;
}

export function getDateParamValue(date: Date) {
    function formatDigit(i: number) {
        return i < 10 ? `0${i}` : i;
    }

    const d = date;

    return `${d.getFullYear()}${formatDigit(d.getMonth() + 1)}${formatDigit(
        d.getDate()
    )}${formatDigit(d.getHours())}${formatDigit(d.getMinutes())}${formatDigit(
        d.getSeconds()
    )}`;
}
