#version 300 es
precision highp int;
precision highp float;
uniform highp sampler3D volume;
uniform float sampling_distance;

in vec3 eye_to_surface_dir;
flat in vec3 eye_pos;
out vec4 color;

float sample_data_volume (vec3 p){
	return texture(volume, p).x;
}

vec2 intersect_box(vec3 orig, vec3 dir) {
	const vec3 box_min = vec3(0);
	const vec3 box_max = vec3(1);
	vec3 inv_dir = 1.0 / dir;
	vec3 tmin_tmp = (box_min - orig) * inv_dir;
	vec3 tmax_tmp = (box_max - orig) * inv_dir;
	vec3 tmin = min(tmin_tmp, tmax_tmp);
	vec3 tmax = max(tmin_tmp, tmax_tmp);
	float t0 = max(tmin.x, max(tmin.y, tmin.z));
	float t1 = min(tmax.x, min(tmax.y, tmax.z));
	return vec2(t0, t1);
}

bool inside_volume_bounds(vec3 p){
	return all(greaterThanEqual(p, vec3(0.f))) && all(lessThanEqual(p, vec3(1.f)));
}

void main(void) { 

    // calculate ray direction as normalized vector
	vec3 ray_dir = normalize(eye_to_surface_dir);

    // calculate distance to intersections between ray and volume
	vec2 t_hit = intersect_box(eye_pos, ray_dir);

    // distance to first intersection should always be shorter than distance to second intersection - discard ray if not
	if (t_hit.x > t_hit.y) {
		discard;
    }

    // if the distance to first intersection of the ray with the box is negative, this intersection is behind the camera
    // we want the ray to start at the ray origin instead, so the distance along ray of the starting point should be 0
	t_hit.x = max(t_hit.x, 0.0);
	
	// compute point where ray traversal begins
    vec3 p = eye_pos + (t_hit.x * ray_dir);

    // take tiny step in ray direction to make sure we are inside the volume bounds
	p += ray_dir * 0.00001;

	while (inside_volume_bounds(p)){

		p += ray_dir * sampling_distance;
	
    }



}