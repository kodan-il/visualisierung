#version 300 es
precision highp int;
precision highp float;
uniform highp sampler3D volume;

// the resolution of the volume (number of voxels in each dimension)
uniform ivec3 volume_dims;

uniform float iso_value;
uniform float dt_scale;
uniform float sampling_distance;
uniform bool illumination_active;
uniform bool binary_search_active;
uniform vec3 light_position;

uniform float specular_reflection_constant;
uniform float diffuse_reflection_constant;
uniform float ambient_reflection_constant;
uniform float shininess_constant;
uniform vec3 specular_light_intensity;
uniform vec3 diffuse_light_intensity;
uniform vec3 ambient_light_intensity;


in vec3 eye_to_surface_dir;
flat in vec3 eye_pos;
out vec4 color;

float sample_data_volume (vec3 p){
	return texture(volume, p).x;
}

vec3 phong_illumination(vec3 p, vec3 ray_dir, vec3 normal){
	normal = normalize(normal);
	vec3 towards_light = normalize(light_position - p);

	vec3 ambient = ambient_light_intensity * ambient_reflection_constant;
	float lambertian = max(0.f, dot(normal, towards_light));
	vec3 diffuse = diffuse_reflection_constant * lambertian * diffuse_light_intensity;
	
	vec3 view_dir = normalize(-ray_dir);
	vec3 reflected_light_vector = reflect(-towards_light, normal);
	float specular_coeff = pow( max(0.f, dot(view_dir, reflected_light_vector)), shininess_constant); 
	vec3 specular = specular_reflection_constant * specular_coeff * specular_light_intensity;

	return ambient + diffuse + specular;
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
	if (t_hit.x > t_hit.y) {
		discard;
	}

    // if the distance to first intersection of the ray with the box is negative, this intersection is behind the camera
    // we want the ray to start at the ray origin instead, so the distance along ray of the starting point should be 0
	t_hit.x = max(t_hit.x, 0.0);
	
	// compute point where ray traversal begins and take small step to make sure we are inside the volume
    vec3 p = eye_pos + (t_hit.x * ray_dir);
	p += ray_dir * 0.00001;


	// YOUR CODE HERE...


}