#version 300 es
#line 4
layout(location=0) in vec3 pos;
uniform mat4 proj_view;
uniform vec3 eye_pos_ws;
uniform vec3 volume_scale;

out vec3 eye_to_surface_dir;
flat out vec3 eye_pos;

void main(void) {
	// TODO: For non-uniform size volumes we need to transform them differently as well
	// to center them properly
	vec3 volume_translation = vec3(0.5) - volume_scale * 0.5;
	gl_Position = proj_view * vec4(pos * volume_scale + volume_translation, 1);
	eye_pos = (eye_pos_ws - volume_translation) / volume_scale;
	eye_to_surface_dir = pos - eye_pos;
}