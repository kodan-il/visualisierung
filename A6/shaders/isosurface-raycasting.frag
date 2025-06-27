#version 300 es
precision highp int;
precision highp float;
uniform highp sampler3D volume;
uniform highp sampler2D transfer_function;
uniform ivec3 volume_dims;
uniform float dt_scale;
uniform float iso_value1;
uniform float iso_value2;
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

vec4 sample_transfer_function(float val){
	return texture(transfer_function, vec2(val, 0));
}

vec3 gradient(vec3 p){
	
	float step = 1.f / float(max(volume_dims.x, max(volume_dims.y, volume_dims.z))); 
	vec3 grad = vec3 (0.f);

	grad.x = sample_data_volume( p + vec3(step, 0, 0)) - sample_data_volume( p - vec3(step, 0, 0));
	grad.y = sample_data_volume( p + vec3(0, step, 0)) - sample_data_volume( p - vec3(0, step, 0));
	grad.z = sample_data_volume( p + vec3(0, 0, step)) - sample_data_volume( p - vec3(0, 0, step));

	grad = grad / vec3(step * 2.f);
	return grad;
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

const int MAX_BINARY_SEARCH_ITERATIONS = 10;

vec3 binary_search(vec3 p1, vec3 p2, float iso_value){

	vec3 upper = p2;
	vec3 lower = p1;
	vec3 mid = p1;

	for(int i = 0; i < MAX_BINARY_SEARCH_ITERATIONS; i++) {
		mid = (upper + lower) * 0.5f;
		float val_at_mid = sample_data_volume(mid);
		if (val_at_mid > iso_value){
			upper = mid;
		}
		else {
			lower = mid;
		}
	}
	return mid;
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

    float last_val = sample_data_volume( p);

	while (inside_volume_bounds(p)){

		float val = sample_data_volume( p);
		
		vec4 isosurface_col = vec4(1,0,0,1);

		if ( (val - iso_value1) * (last_val - iso_value1) < 0.f){

			vec3 intersection = p;
			if (binary_search_active){
				intersection = binary_search(p - (ray_dir * sampling_distance), p, iso_value1);
			}

			if (illumination_active){
				vec3 normal = -normalize(gradient(intersection));
				//combine illumination with transfer function color
				isosurface_col += vec4(phong_illumination(intersection, ray_dir, normal), 1);
			}
			color = isosurface_col;
			break;
        }

		last_val = val;
		p += ray_dir * sampling_distance;

	}
}