"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeStructuredData = normalizeStructuredData;
function isPrimitive(val) {
    return (val === null ||
        typeof val === 'string' ||
        typeof val === 'number' ||
        typeof val === 'boolean');
}
function isLeafNode(val) {
    if (val === null || typeof val !== 'object' || Array.isArray(val)) {
        return false;
    }
    const keys = Object.keys(val);
    if (keys.length === 0)
        return true;
    return keys.every((k) => k === 'attributes' || k === 'value');
}
/**
 * Normalizes arbitrary structured JS objects into flat DocumentSections.
 * Reused by both JSON and XML parsers.
 */
function normalizeStructuredData(data, rootTitle, format) {
    const sections = [];
    if (data === null || data === undefined) {
        return [];
    }
    // JSON specific: if root is an anonymous object with a single key, unwrap it
    if (format === 'json' && typeof data === 'object' && !Array.isArray(data)) {
        const keys = Object.keys(data);
        if (keys.length === 1 && keys[0]) {
            const key = keys[0];
            const val = data[key];
            if (typeof val === 'object' && val !== null) {
                if (Array.isArray(val)) {
                    sections.push({
                        title: key,
                        level: 1,
                        content: [{ type: `${format}-array`, content: val }],
                    });
                }
                else {
                    normalizeObjectIterative(val, key, 1, sections, format);
                }
                return sections;
            }
        }
    }
    // Fallback / standard case
    if (typeof data !== 'object') {
        sections.push({
            title: rootTitle,
            level: 1,
            content: [{ type: format, content: data }],
        });
    }
    else if (Array.isArray(data)) {
        sections.push({
            title: rootTitle,
            level: 1,
            content: [{ type: `${format}-array`, content: data }],
        });
    }
    else {
        normalizeObjectIterative(data, rootTitle, 1, sections, format);
    }
    return sections;
}
function normalizeObjectIterative(rootObj, rootTitle, rootLevel, sections, format) {
    const stack = [{ obj: rootObj, title: rootTitle, level: rootLevel }];
    while (stack.length > 0) {
        const { obj, title, level } = stack.pop();
        const section = {
            title,
            level,
            content: [],
        };
        const primitives = {};
        const arrays = [];
        const nestedObjects = [];
        for (const [key, val] of Object.entries(obj)) {
            if (key === 'attributes' || key === 'value') {
                primitives[key] = val;
            }
            else if (isLeafNode(val) || isPrimitive(val)) {
                primitives[key] = val;
            }
            else if (Array.isArray(val)) {
                arrays.push({ key, val });
            }
            else if (typeof val === 'object' && val !== null) {
                nestedObjects.push({ key, val });
            }
        }
        // Group primitives
        if (Object.keys(primitives).length > 0) {
            section.content.push({
                type: format,
                content: primitives,
            });
        }
        // Add arrays
        for (const arr of arrays) {
            section.content.push({
                type: `${format}-array`,
                content: arr.val,
            });
        }
        sections.push(section);
        // Push nested objects in reverse order to preserve original order in DFS
        for (let i = nestedObjects.length - 1; i >= 0; i--) {
            const nested = nestedObjects[i];
            stack.push({
                obj: nested.val,
                title: nested.key,
                level: level + 1,
            });
        }
    }
}
