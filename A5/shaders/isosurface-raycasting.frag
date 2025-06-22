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


	float last_sample = 0.f;
	float current_sample = 0.f;

	color = vec4(0.1f, 0.1f, 0.1f, 1.1f);
	float v_pos = 0.f;
	float v_neg = 0.f;
	float grad = 0.f;
	float step = 1.f / float(volume_dims.x);

	while (inside_volume_bounds(p))
	{
		current_sample = sample_data_volume(p);

		if(last_sample <= iso_value && iso_value <= current_sample) {
			//iso surface found

			if(binary_search_active){
				vec3 lower = p - ray_dir * sampling_distance;
				vec3 upper = p;
				vec3 mid = upper;

				for(int i = 0; i < 3; i++){
					mid = lower + upper;
					mid.x /= 2.f;
					mid.y /= 2.f;
					mid.z /= 2.f;
					float v = sample_data_volume(mid);
					if(v > iso_value){
						upper = mid;
					} else {
						lower = mid;
					}
				}
				p = mid;
			}

			if(illumination_active){
				//calculate gradient
				float v_pos_x = sample_data_volume(p + vec3(step, 0, 0));
				float v_neg_x = sample_data_volume(p - vec3(step, 0, 0));

				float v_pos_y = sample_data_volume(p + vec3(0, step, 0));
				float v_neg_y = sample_data_volume(p - vec3(0, step, 0));

				float v_pos_z = sample_data_volume(p + vec3(0, 0, step));
				float v_neg_z = sample_data_volume(p - vec3(0, 0, step));

				float grad_x = (v_pos_x - v_neg_x) / (2.0 * step);
				float grad_y = (v_pos_y - v_neg_y) / (2.0 * step);
				float grad_z = (v_pos_z - v_neg_z) / (2.0 * step);

				vec3 gradient = vec3(grad_x, grad_y, grad_z);

				color.rgb = phong_illumination(p, ray_dir, gradient);
			} else {
				color.rgb = ambient_light_intensity;
			}

			break;
		}

		last_sample = current_sample;
		p += ray_dir * sampling_distance;
	}

}