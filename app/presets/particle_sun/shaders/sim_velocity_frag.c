// simulation
varying vec2 vUv;

uniform sampler2D tPositions;
uniform sampler2D tVelocities;
uniform sampler2D origin;

uniform float timer;
uniform vec3 velocity;
uniform float multiplier;
uniform float randomNum;

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
    vec3 closestPoint = getClosestPointOnPalantirLogo(pos).xyz;
    return vec3((-pos.x + closestPoint.x) * .005,
                (-pos.y + closestPoint.y) * .005,
                (-pos.z + closestPoint.z) * .005);
}

bool onLogo(vec3 pos) {
    float dist = sqrt(pos.x * pos.x + pos.y * pos.y);
    return (dist < 1.3) && (dist > 0.7) && (pos.z > -0.3) && (pos.z < 0.3);
}

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

float getAngle(float x, float y) {
    return atan(y, x);
}
void main() 
{
    vec3 origin = texture2D( origin, vUv ).xyz;
    vec3 pos = texture2D( tPositions, vUv ).xyz;
    vec3 vel = texture2D( tVelocities, vUv).xyz;
    vec3 palantirForce = getPullToPalantirLogo(pos).xyz;

    /*pos.x += snoise(vec4(pos.x, pos.y, pos.z, timer/10000.0)) * 0.01;*/
    /*pos.y += snoise(vec4(pos.x, pos.y, pos.z, 1.352+timer/10000.0)) * 0.01;*/
    /*pos.z += snoise(vec4(pos.x, pos.y, pos.z, 12.352+timer/10000.0)) * 0.01;*/


    /*pos.x += gravityForce.x;*/
    /*pos.y += gravityForce.y;*/
    /*pos.z += gravityForce.z;*/

    /*pos.x += palantirForce.x;*/
    /*pos.y += palantirForce.y;*/
    /*pos.z += palantirForce.z;*/

    bool isOnLogo = onLogo(pos);
    float BUCKETS = 85.0;

    float PI = 3.1415;

    bool isSlow = (vel.x + vel.y + vel.z) < 1.0;
    float angle = atan(pos.y, pos.x) + PI;
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
        vel.x += (closestPoint.x * audioLevel * audioLevel ) * 0.03; 
        vel.y += (closestPoint.y * audioLevel * audioLevel ) * 0.03; 
        vel.z += (closestPoint.z * audioLevel * audioLevel ) * 0.3; 
        vel.x -= palantirForce.x * 10.0;
        vel.y -= palantirForce.y * 10.0;
        vel.z -= palantirForce.z * 10.0;
        vel.x += randomNum ;
        vel.y += randomNum ;
        vel.z += 5.0 * randomNum ;
    } else {
        vel.x += palantirForce.x * 1.5;
        vel.y += palantirForce.y * 1.5;
        vel.z += palantirForce.z * 1.5;
    }
    vel.x *= 0.90;
    vel.y *= 0.90;
    vel.z *= 0.90;


    /*vel.x = 0.0020;*/
    /*vel.y = 0.0020;*/
    /*vel.z = 0.0020;*/
    

    // pos.y -= randomNum * 0.001;




    /*pos.x = origin.x * multiplier;*/
    /*pos.y = origin.y * multiplier;*/
    /*pos.z = origin.z * multiplier;*/

    // Write new position out
    gl_FragColor = vec4(vel, 1.0);
}
