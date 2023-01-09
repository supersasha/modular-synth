export function fmod(x: number, y: number): number {
    const d = x / y;
    return (d - Math.floor(d)) * y;
}


