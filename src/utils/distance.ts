export function getDistancebetweenCoordinates(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
    unit: 'km' | 'mi' = 'km'

): number {
    const toRadians = (deg: number) => deg * (Math.PI / 180);

    const R = unit === 'km' ? 6371 : 3958.8; // Radius of the Earth in kilometers or miles
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;

}



export function calculateTravelTimes(distanceInMiles: number) {
    const speeds = {
        walking: 3,
        cycling: 12,
        carPrivate: 25,
        carHire: 22,
        publicTransport: 15
    };

    const calculateMinutes = (speed: number) =>
        Math.ceil((distanceInMiles / speed) * 60);

     const formatCompact = (totalMinutes: number): string => {
        if (totalMinutes < 60) {
            return `${totalMinutes}m`;
        }

        const hoursTotal = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hoursTotal < 24) {
            if (minutes === 0) return `${hoursTotal}h`;
            return `${hoursTotal}h ${minutes}m`;
        }

        const days = Math.floor(hoursTotal / 24);
        const remainingHours = hoursTotal % 24;

        if (minutes === 0) {
            return `${days}d ${remainingHours}h`;
        }

        return `${days}d ${remainingHours}h ${minutes}m`;
    };

    return {
        walking: formatCompact(calculateMinutes(speeds.walking)),
        cycling: formatCompact(calculateMinutes(speeds.cycling)),
        carPrivate: formatCompact(calculateMinutes(speeds.carPrivate)),
        carHire: formatCompact(calculateMinutes(speeds.carHire)),
        publicTransport: formatCompact(calculateMinutes(speeds.publicTransport))
    };

}


