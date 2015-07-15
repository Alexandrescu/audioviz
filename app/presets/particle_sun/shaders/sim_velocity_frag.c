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
    return vec3(pos.x / dist, pos.y / dist, pos.z );
}

vec3 getPullToPalantirLogo(vec3 pos) {
    float dist = sqrt(pos.x * pos.x + pos.y * pos.y);
    vec3 closestPoint = getClosestPointOnPalantirLogo(pos).xyz;
    return vec3((-pos.x + closestPoint.x) / (dist*200.0),
                (-pos.y + closestPoint.y) / (dist*200.0),
                (-pos.z + closestPoint.z) / (dist*200.0));
}

bool onLogo(vec3 pos) {
    float dist = sqrt(pos.x * pos.x + pos.y * pos.y);
    return (dist < 1.1) && (dist > 0.9) && (pos.z > -0.2) && (pos.z < 0.2);
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
    vec3 palantirForce = getPullToPalantirLogo(pos).xyz;

    bool isOnLogo = onLogo(pos);
    float BUCKETS = 85.0;

    float PI = 3.1415;

    bool isSlow = (vel.x + vel.y + vel.z) < 1.0;
    float angle = mod(atan(pos.y, pos.x) + PI + rotation, 2.0 * PI);
    float index2 = ((BUCKETS * angle) / ( 2.0 * PI));
    int index = int(index2);
    float audioLevel = 0.0;
    for (int x = 0; x < 85; x++) {
        if (x == index) {
            /*audioLevel = audioLevels[x] * ( 1.0 - abs(index2 - float(index) - .5));*/
            audioLevel = audioLevels[x];
        }
    }
    if (isOnLogo && isSlow) {
        vec3 closestPoint = getClosestPointOnPalantirLogo(pos).xyz;
        vel.x += (closestPoint.x * audioLevel * audioLevel ) * 0.03 - palantirForce.x * 10.0; 
        vel.y += (closestPoint.y * audioLevel * audioLevel ) * 0.03 - palantirForce.y * 10.0; 
        vel.z += (closestPoint.z * audioLevel * audioLevel ) * 0.30 - palantirForce.y * 10.0;
        vel.x += randomNum ;
        vel.y += randomNum ;
        vel.z += 5.0 * randomNum ;
    } else {
        vel.x += palantirForce.x * 1.5;
        vel.y += palantirForce.y * 1.5;
        vel.z += palantirForce.z * 1.5;
    }
    vel.x *= 0.95;
    vel.y *= 0.95;
    vel.z *= 0.95;

    // Write new position out
    gl_FragColor = vec4(vel, 1.0);
}
