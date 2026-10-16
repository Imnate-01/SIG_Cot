export interface UserData {
    id: string;
    email: string;
    nombre?: string;
    rol?: string;
    departamento?: string;
}

export function isValidUserData(data: any): data is UserData {
    if (typeof data !== 'object' || data === null) return false;

    // Basic required fields for our app logic
    // Adjust 'id' type checking if it can be number or string
    if (!('id' in data) || (typeof data.id !== 'string' && typeof data.id !== 'number')) return false;
    if (!('email' in data) || typeof data.email !== 'string') return false;

    // Optional fields that we use for logic, check types if they exist
    if ('rol' in data && typeof data.rol !== 'string' && data.rol !== null) return false;
    if ('departamento' in data && typeof data.departamento !== 'string' && data.departamento !== null) return false;

    return true;
}

export function validateAndParseUserData(jsonString: string | null): UserData | null {
    if (!jsonString) return null;
    try {
        const parsed = JSON.parse(jsonString);
        if (isValidUserData(parsed)) {
            return parsed;
        }
        return null;
    } catch {
        return null;
    }
}
