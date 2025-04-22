/**
 * Converts a JSON object into a Map.
 *
 * @param {any} json - The input JSON object.
 * @returns {Map<string, any>} A Map representation of the JSON.
 */
export function JSONToMap(json: any): Map<string, any> {
    let map = new Map<string, any>();

    // Iterate through each key in the JSON and store it in the Map
    for (let key in json) {
        map.set(key, json[key]);
    }

    return map;
}

/**
 * Converts a Map into a JSON object.
 *
 * @param {Map<string, any>} map - The input Map.
 * @returns {any} A JSON object representation of the Map.
 */
export function mapToJSON(map: Map<string, any>): any {
    let json: any = {};

    // Iterate through each entry in the Map and store it in the JSON object
    map.forEach((value, key) => {
        json[key] = value;
    });

    return json;
}

/**
 * Converts a JSON object into a string.
 *
 * @param {any} json - The JSON object to be stringified.
 * @returns {string} A string representation of the JSON.
 */
export function JSONToString(json: any): string {
    return JSON.stringify(json);
}

/**
 * Parses a JSON string into a JSON object.
 *
 * @param {string} str - The JSON string to be parsed.
 * @returns {any} A JSON object representation of the string.
 */
export function stringToJSON(str: string): any {
    return JSON.parse(str);
}


export function filterNullValues<T, K extends keyof T>(arr: T[], key: K): T[] {
    return arr.filter(row => row[key] !== null && row[key] !== "null");
  }  
  


// Fuck it, we ball type shit below to fall back on if something goes wrong
// Keeping exports grouped for easy fallback if needed
// export { JSONToMap, mapToJSON, JSONToString, stringToJSON };