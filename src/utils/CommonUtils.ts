export function formatBytes(bytes: number): string {
    console.log(`Bytes: ${bytes}`)
    if (bytes === 0) return '0B';
    const k = 1024;  // Binary prefix
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    let result = bytes / Math.pow(k, i);
    
    // Check if the unit is KB and round up to the nearest 10
    if (sizes[i] === 'KB') {
        result = Math.ceil(result / 10) * 10;
        // Add some extra bytes for json upload
        result += 4
    } else {
        result = Math.ceil(result);  // Round up to the nearest whole number
    }
    console.log(`Allocated size: ${result + sizes[i]}`)
    
    return result + sizes[i];
}

export function humanSizeToBytes(input: string): number | boolean {
    const UNITS = ["kb", "mb", "gb"];
    let chunk_size = 0;
    let humanReadable = input.toLowerCase();
    let inputNumber = Number(humanReadable.slice(0, humanReadable.length - 2));
    let inputDescriptor = humanReadable.slice(
        humanReadable.length - 2,
        humanReadable.length
    );
    if (!UNITS.includes(inputDescriptor) || !inputNumber) {
        return false;
    }

    switch (inputDescriptor) {
        case "kb":
            chunk_size = 1_024;
            break;
        case "mb":
            chunk_size = 1_048_576;
            break;
        case "gb":
            chunk_size = 1_073_741_824;
            break;

        default:
            break;
    }

    return Math.ceil(inputNumber * chunk_size);
}
