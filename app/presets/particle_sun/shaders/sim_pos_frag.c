uniform sampler2D tPositions;
uniform sampler2D origin;
uniform sampler2D tVelocities;

varying vec2 vUv;
uniform float timer;
uniform vec3 velocity;
uniform float multiplier;
void main() 
{
    vec3 pos = texture2D(tPositions, vUv).xyz;
    vec3 vel = texture2D(tVelocities, vUv).xyz;
    pos.x += vel.x;
    pos.y += vel.y;
    pos.z += vel.z;

    // Write new position out
    gl_FragColor = vec4(pos, 1.0);
}

