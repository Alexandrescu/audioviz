#ifdef GL_ES
precision mediump float;
#endif

varying vec2 uv;
varying vec2 uv_orig;
		
bool is_onscreen(vec2 uv){
	return (uv.x < 1.) && (uv.x > 0.) && (uv.y < 1.) && (uv.y > 0.);
}

float border(vec2 uv, float border, vec2 texSize){
	uv*=texSize;
	return (uv.x<border || uv.x>texSize.x-border || uv.y<border || uv.y >texSize.y-border) ? 1.:.0;
}

#define pi 3.141592653589793238462643383279
#define pi_inv 0.318309886183790671537767526745
#define pi2_inv 0.159154943091895335768883763372

float border(vec2 domain, float thickness){
   vec2 uv = fract(domain-vec2(0.5));
   uv = min(uv,1.-uv)*2.;
   return clamp(max(uv.x,uv.y)-1.+thickness,0.,1.)/(thickness);
}

float square_mask(vec2 domain){
	return (domain.x <= 1. && domain.x >= 0. && domain.y <= 1. && domain.y >= 0.) ? 1. : 0.; 
}

vec2 complex_mul(vec2 factorA, vec2 factorB){
   return vec2( factorA.x*factorB.x - factorA.y*factorB.y, factorA.x*factorB.y + factorA.y*factorB.x);
}

vec2 spiralzoom(vec2 domain, vec2 center, float n, float spiral_factor, float zoom_factor, vec2 pos){
	vec2 uv = domain - center;
	float d = length(uv);
	return vec2( atan(uv.y, uv.x)*n*pi2_inv + d*spiral_factor, -log(d)*zoom_factor) + pos;
}

vec2 complex_div(vec2 numerator, vec2 denominator){
   return vec2( numerator.x*denominator.x + numerator.y*denominator.y,
                numerator.y*denominator.x - numerator.x*denominator.y)/
          vec2(denominator.x*denominator.x + denominator.y*denominator.y);
}

// HSL to RGB converter code from http://www.gamedev.net/topic/465948-hsl-shader-glsl-code/
float Hue_2_RGB(float v1, float v2, float vH )
{
	float ret;
   if ( vH < 0.0 )
     vH += 1.0;
   if ( vH > 1.0 )
     vH -= 1.0;
   if ( ( 6.0 * vH ) < 1.0 )
     ret = ( v1 + ( v2 - v1 ) * 6.0 * vH );
   else if ( ( 2.0 * vH ) < 1.0 )
     ret = ( v2 );
   else if ( ( 3.0 * vH ) < 2.0 )
     ret = ( v1 + ( v2 - v1 ) * ( ( 2.0 / 3.0 ) - vH ) * 6.0 );
   else
     ret = v1;
   return ret;
}

vec3 hsl2rgb(float H, float S, float L){
	float var_2, var_1, R, G, B;	
	if (S == 0.0)
	{
	   R = L;
	   G = L;
	   B = L;
	}
	else
	{
	   if ( L < 0.5 )
	   {
		   var_2 = L * ( 1.0 + S );
	   }
	   else
	   {
		   var_2 = ( L + S ) - ( S * L );
	   }

	   var_1 = 2.0 * L - var_2;

	   R = Hue_2_RGB( var_1, var_2, H + ( 1.0 / 3.0 ) );
	   G = Hue_2_RGB( var_1, var_2, H );
	   B = Hue_2_RGB( var_1, var_2, H - ( 1.0 / 3.0 ) );
	}
	return vec3(R,G,B);
}

vec2 gradient(sampler2D sampler, vec2 uv, vec2 d, vec4 selector){
	vec4 dX = 0.5*texture2D(sampler, uv + vec2(1.,0.)*d) - 0.5*texture2D(sampler, uv - vec2(1.,0.)*d);
	vec4 dY = 0.5*texture2D(sampler, uv + vec2(0.,1.)*d) - 0.5*texture2D(sampler, uv - vec2(0.,1.)*d);
	return vec2( dot(dX, selector), dot(dY, selector) );
}

vec2 rot90(vec2 vector){
	return vector.yx*vec2(1,-1);
}

vec4 sat(sampler2D sampler_sat, vec2 pos, vec2 size){
	vec4 s = vec4(0);
	s += texture2D(sampler_sat, pos );
	s += texture2D(sampler_sat, pos + size );
	s -= texture2D(sampler_sat, pos + size * vec2(1, 0) );
	s -= texture2D(sampler_sat, pos + size * vec2(0, 1) );
	return s / ( size.x * size.y );
}

vec4 boxblur(sampler2D sampler_sat, vec2 uv, vec2 pixelSize, float boxsize){
	return sat(sampler_sat, uv - boxsize*0.5*pixelSize, boxsize*pixelSize) * pixelSize.x * pixelSize.y;
}

float line_segment(vec2 domain, vec2 p1, float d1, vec2 p2, float d2){
  float h = 1./(p2.x-p1.x); // helper registers
  float h1 = (p2.y-p1.y)*h;
  float h2 = 1./h1;
  float xs = (-p1.y+h1*p1.x+h2*domain.x+domain.y)/(h2+h1);// coordinates of the point on the line between p1 and p2,
  float ys = -h2*(xs-domain.x)+domain.y;					// ^ orthogonally to the given point in the domain
  float d = length(domain-vec2(xs,ys));		// the orthogonal distance from the domain point to the line (unlimited) 
  float s = 0.; // distance from domain point to p1 relative to p2
  if(p2.x == p1.x){	// division by zero fix
    d = abs(domain.x - p1.x);
    s = (p1.y-ys)/(p1.y-p2.y);
  }else{
    s = (xs-p1.x)*h;						 
  }
  d = clamp(d*(d1*(1.-s)+d2*s),0., 1.);	// adjusting the line thickness using a linear interpolation with s
  float m1 = 0.; if(s > 0.) m1 = 1.; 		// masking out the segment between p1 and p2
  float m2 = 0.; if(s < 1.) m2 = 1.;
  float result = clamp( m1*m2-d, 0., 1.); // return result as 1-distance in the range [0..1]
  result = clamp(1.-length(domain-vec2(p1.x,p1.y))*d1-m1, result, 1.);	// round corners if you will (half circles)
  //result = clamp(1.-length(domain-vec2(p2.x,p2.y))*d2-m2, result, 1.);
 	 
  return result;
}

