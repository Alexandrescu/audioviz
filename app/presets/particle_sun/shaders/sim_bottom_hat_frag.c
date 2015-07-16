// simulation
varying vec2 vUv;

uniform sampler2D tPositions;
uniform sampler2D tVelocities;
uniform sampler2D origin;

uniform float timer;
uniform vec3 velocity;
uniform float multiplier;
uniform float randomNum;
uniform float rotation;

uniform float audioLevels[128];
vec3 getClosestPointOnPalantirLogo(vec3 pos) {
    // normalize pair (pos.x, pos.y)
    float dist = sqrt(pos.x * pos.x + pos.y * pos.y) ;
    if (pos.z > 0.1 || pos.z < -0.1) {
        return vec3(pos.x / dist, pos.y / dist, pos.z * 0.6 );
    }
    vec3 closestToCircle = vec3(pos.x / dist, pos.y / dist, pos.z );
    
    return closestToCircle;
}

vec3 getPullToPalantirLogo(vec3 pos) {
    vec3 closestPoint = getClosestPointOnPalantirLogo(pos).xyz;
    float s = pow((pos.x - closestPoint.x), 2.0) + pow((pos.y - closestPoint.y), 2.0);
    float dist = max(sqrt(s), 0.55);
    return vec3((-pos.x + closestPoint.x) / (dist*dist*70.0),
                (-pos.y + closestPoint.y) / (dist*dist*70.0),
                (-pos.z + closestPoint.z) / (dist*dist*70.0));
}

vec3 getClosestPoint(vec3 pos) {
    vec3 closestPoint = vec3(0.0, 0.0, min(max(pos.z , -1.0), 1.0));
    closestPoint.x = (pos.y + 2.0 * abs(pos.x) + 1.9) / 2.5;
    closestPoint.y = 0.5 * closestPoint.x - 1.9;

    if (pos.x < 0.0 ) {
        closestPoint.x = -closestPoint.x;
    }

    closestPoint.x = max (closestPoint.x, -2.0);
    closestPoint.x = min (closestPoint.x, 2.0);
    return closestPoint;
}

vec3 getPullToBottom(vec3 pos, vec3 closestPoint) {
    // line 1: y = -x - 4
    float s = pow((pos.x - closestPoint.x), 2.0) + pow((pos.y - closestPoint.y), 2.0);
    float dist = max(sqrt(s), 0.55);
    return vec3((-pos.x + closestPoint.x) / (dist * dist * 70.0) ,
                (-pos.y + closestPoint.y) / (dist * dist * 70.0) ,
                (-pos.z + closestPoint.z) / (dist * dist * 70.0)) ;
}

bool onLogo(vec3 pos, vec3 closestPoint) {
    float dist = sqrt(pow(closestPoint.x - pos.x, 2.0) + pow(closestPoint.y - pos.y, 2.0));

    return (dist < 0.01) &&  (pos.z < 1.0) && (pos.z > -1.0);
}

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

float getAngle(float x, float y) {
    return atan(y, x);
}
void main() 
{
    vec3 pos = texture2D( tPositions, vUv ).xyz;
    vec3 vel = texture2D( tVelocities, vUv).xyz;
    vec3 closestPoint = getClosestPoint(pos).xyz;
    vec3 palantirForce = getPullToBottom(pos, closestPoint).xyz;


    if (onLogo(pos, closestPoint)) {
        vel.y -= multiplier  * 0.05;
        vel.z += closestPoint.z * multiplier * 0.3;
        vel.y += randomNum * 2.0 ;
    } else {
        vel.y += palantirForce.y * 1.0 ;
        vel.z += palantirForce.z * 1.0 ;
    }

    vel.x *= 0.93;
    vel.y *= 0.93;
    vel.z *= 0.93;

    // Write new position out
    gl_FragColor = vec4(vel, 1.0);
}
