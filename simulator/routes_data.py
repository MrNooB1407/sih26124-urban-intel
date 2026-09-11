"""Bus route waypoint data for Hyderabad."""

ROUTES = {
    "Secunderabad-HITEC": {
        "name": "Secunderabad-HITEC",
        "waypoints": [
            (17.4334, 78.5016),  # Secunderabad Station
            (17.4428, 78.4872),  # Paradise
            (17.4442, 78.4776),  # Rasoolpura
            (17.4455, 78.4682),  # Begumpet
            (17.4412, 78.4556),  # Begumpet Railway
            (17.4265, 78.4528),  # Punjagutta
            (17.4248, 78.4485),  # Nagarjuna Circle
            (17.4194, 78.4452),  # Banjara Hills Rd 1
            (17.4230, 78.4320),  # Banjara Hills Rd 10
            (17.4290, 78.4110),  # Jubilee Hills
            (17.4338, 78.4005),  # Peddamma Gudi
            (17.4395, 78.3905),  # Madhapur
            (17.4504, 78.3808),  # HITEC City
            (17.4415, 78.3802),  # Mindspace
            (17.4312, 78.3705),  # Bio-Diversity
            (17.4372, 78.3444),  # Gachibowli
        ]
    },
    "Mehdipatnam-JNTU": {
        "name": "Mehdipatnam-JNTU",
        "waypoints": [
            (17.3950, 78.4406),
            (17.3980, 78.4350),
            (17.4020, 78.4280),
            (17.4100, 78.4200),
            (17.4150, 78.4150),
            (17.4200, 78.4100),
            (17.4280, 78.4020),
            (17.4350, 78.3950),
            (17.4420, 78.3880),
            (17.4480, 78.3830),
            (17.4520, 78.3780),
            (17.4570, 78.3720),
            (17.4620, 78.3680),
            (17.4680, 78.3620),
        ]
    },
    "Secunderabad-Charminar": {
        "name": "Secunderabad-Charminar",
        "waypoints": [
            (17.4340, 78.5010),
            (17.4280, 78.4980),
            (17.4200, 78.4950),
            (17.4120, 78.4920),
            (17.4050, 78.4890),
            (17.3980, 78.4850),
            (17.3920, 78.4820),
            (17.3870, 78.4800),
            (17.3810, 78.4770),
            (17.3750, 78.4740),
            (17.3680, 78.4720),
            (17.3610, 78.4740),
        ]
    }
}

def interpolate_position(waypoints, progress):
    """Interpolate GPS position along a route given 0-1 progress fraction.
    
    Args:
        waypoints: list of (lat, lng) tuples
        progress: float 0.0 to 1.0
    
    Returns:
        (lat, lng) tuple
    """
    import math
    if progress <= 0:
        return waypoints[0]
    if progress >= 1:
        return waypoints[-1]
    
    # Calculate total distance
    distances = []
    total = 0
    for i in range(len(waypoints) - 1):
        d = math.sqrt((waypoints[i+1][0] - waypoints[i][0])**2 + 
                      (waypoints[i+1][1] - waypoints[i][1])**2)
        distances.append(d)
        total += d
    
    target = progress * total
    accumulated = 0
    for i, d in enumerate(distances):
        if accumulated + d >= target:
            frac = (target - accumulated) / d if d > 0 else 0
            lat = waypoints[i][0] + frac * (waypoints[i+1][0] - waypoints[i][0])
            lng = waypoints[i][1] + frac * (waypoints[i+1][1] - waypoints[i][1])
            return (lat, lng)
        accumulated += d
    return waypoints[-1]

def get_segment_index(waypoints, progress):
    """Get which segment (0-indexed) we're on given progress 0-1."""
    import math
    if progress <= 0: return 0
    if progress >= 1: return len(waypoints) - 2
    
    distances = []
    total = 0
    for i in range(len(waypoints) - 1):
        d = math.sqrt((waypoints[i+1][0] - waypoints[i][0])**2 + 
                      (waypoints[i+1][1] - waypoints[i][1])**2)
        distances.append(d)
        total += d
    
    target = progress * total
    accumulated = 0
    for i, d in enumerate(distances):
        if accumulated + d >= target:
            return i
        accumulated += d
    return len(waypoints) - 2
