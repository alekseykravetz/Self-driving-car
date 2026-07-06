export function safeJsonParse(raw) {
    if (raw == null)
        return null;
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
export function stripFileExtension(name) {
    const dot = name.lastIndexOf('.');
    return dot > 0 ? name.slice(0, dot) : name;
}
