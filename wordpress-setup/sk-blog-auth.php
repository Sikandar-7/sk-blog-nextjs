<?php
/**
 * SK Blog Auth & CORS Plugin
 * Custom REST endpoints for frontend register/login/category/tag creation
 */

// ─── CORS ────────────────────────────────────────────────────
add_action('rest_api_init', function () {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function ($value) {
            $allowed = ['http://localhost:3000', 'http://127.0.0.1:3000'];
            $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
            header('Access-Control-Allow-Origin: ' . (in_array($origin, $allowed) ? $origin : 'http://localhost:3000'));
            header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, Authorization, X-WP-Nonce');
            header('Access-Control-Allow-Credentials: true');
            return $value;
        }
        );    }, 15);

add_action('init', function () {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        header('Access-Control-Allow-Origin: http://localhost:3000');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-WP-Nonce');
        status_header(200);
        exit();
    }
});

// ─── Register Routes ─────────────────────────────────────────
add_action('rest_api_init', function () {

    register_rest_route('sk-blog/v1', '/register', [
        'methods' => 'POST',
        'callback' => 'sk_blog_register',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('sk-blog/v1', '/login', [
        'methods' => 'POST',
        'callback' => 'sk_blog_login',
        'permission_callback' => '__return_true',
    ]);

    // POST /wp-json/sk-blog/v1/create-category
    register_rest_route('sk-blog/v1', '/create-category', [
        'methods' => 'POST',
        'callback' => 'sk_blog_create_category',
        'permission_callback' => 'sk_blog_is_authenticated',
    ]);

    // POST /wp-json/sk-blog/v1/create-tag
    register_rest_route('sk-blog/v1', '/create-tag', [
        'methods' => 'POST',
        'callback' => 'sk_blog_create_tag',
        'permission_callback' => 'sk_blog_is_authenticated',
    ]);
});

// ─── Auth check via Application Password ─────────────────────
function sk_blog_is_authenticated()
{
    return is_user_logged_in();
}

// ─── Register Handler ────────────────────────────────────────
function sk_blog_register(WP_REST_Request $request)
{
    $name = sanitize_text_field($request->get_param('name') ?? '');
    $username = sanitize_user($request->get_param('username') ?? '');
    $email = sanitize_email($request->get_param('email') ?? '');
    $password = $request->get_param('password') ?? '';

    if (!$username || !$email || !$password || !$name)
        return new WP_Error('missing_fields', 'Please fill in all fields.', ['status' => 400]);
    if (!is_email($email))
        return new WP_Error('invalid_email', 'Invalid email address.', ['status' => 400]);
    if (username_exists($username))
        return new WP_Error('username_taken', 'Username is already taken.', ['status' => 409]);
    if (email_exists($email))
        return new WP_Error('email_taken', 'Email is already registered.', ['status' => 409]);
    if (strlen($password) < 6)
        return new WP_Error('weak_password', 'Password must be at least 6 characters.', ['status' => 400]);

    $user_id = wp_create_user($username, $password, $email);
    if (is_wp_error($user_id))
        return new WP_Error('create_failed', $user_id->get_error_message(), ['status' => 500]);

    wp_update_user(['ID' => $user_id, 'display_name' => $name, 'first_name' => $name, 'role' => 'author']);

    $app_pass_data = WP_Application_Passwords::create_new_application_password($user_id, ['name' => 'SK Blog Frontend']);
    if (is_wp_error($app_pass_data))
        return new WP_Error('app_pass_failed', 'Could not create auth token.', ['status' => 500]);

    $token = base64_encode($username . ':' . $app_pass_data[0]);
    return rest_ensure_response(['success' => true, 'message' => 'Account created!', 'user' => ['id' => $user_id, 'username' => $username, 'name' => $name, 'email' => $email], 'token' => $token]);
}

// ─── Login Handler ───────────────────────────────────────────
function sk_blog_login(WP_REST_Request $request)
{
    $username = sanitize_user($request->get_param('username') ?? '');
    $password = $request->get_param('password') ?? '';

    if (!$username || !$password)
        return new WP_Error('missing_fields', 'Username and password required.', ['status' => 400]);

    $user = wp_authenticate($username, $password);
    if (is_wp_error($user))
        return new WP_Error('auth_failed', 'Invalid username or password.', ['status' => 401]);

    // Refresh app password on login
    foreach (WP_Application_Passwords::get_user_application_passwords($user->ID) as $ap) {
        if ($ap['name'] === 'SK Blog Frontend')
            WP_Application_Passwords::delete_application_password($user->ID, $ap['uuid']);
    }

    $app_pass_data = WP_Application_Passwords::create_new_application_password($user->ID, ['name' => 'SK Blog Frontend']);
    if (is_wp_error($app_pass_data))
        return new WP_Error('token_failed', 'Could not create auth token.', ['status' => 500]);

    $token = base64_encode($user->user_login . ':' . $app_pass_data[0]);

    // Check if user is admin
    $user_obj = get_user_by('id', $user->ID);
    $is_admin = in_array('administrator', (array)$user_obj->roles);

    return rest_ensure_response(['success' => true, 'user' => ['id' => $user->ID, 'username' => $user->user_login, 'name' => $user->display_name, 'email' => $user->user_email, 'is_admin' => $is_admin], 'token' => $token]);
}

// ─── Create Category ─────────────────────────────────────────
function sk_blog_create_category(WP_REST_Request $request)
{
    $name = sanitize_text_field($request->get_param('name') ?? '');
    if (!$name)
        return new WP_Error('missing_name', 'Category name is required.', ['status' => 400]);

    // Check if exists
    $existing = get_term_by('name', $name, 'category');
    if ($existing)
        return rest_ensure_response(['success' => true, 'id' => $existing->term_id, 'name' => $existing->name, 'slug' => $existing->slug, 'existed' => true]);

    $result = wp_insert_term($name, 'category');
    if (is_wp_error($result))
        return new WP_Error('cat_failed', $result->get_error_message(), ['status' => 500]);

    $term = get_term($result['term_id'], 'category');
    return rest_ensure_response(['success' => true, 'id' => $term->term_id, 'name' => $term->name, 'slug' => $term->slug, 'existed' => false]);
}

// ─── Create Tag ──────────────────────────────────────────────
function sk_blog_create_tag(WP_REST_Request $request)
{
    $name = sanitize_text_field($request->get_param('name') ?? '');
    if (!$name)
        return new WP_Error('missing_name', 'Tag name is required.', ['status' => 400]);

    $existing = get_term_by('name', $name, 'post_tag');
    if ($existing)
        return rest_ensure_response(['success' => true, 'id' => $existing->term_id, 'name' => $existing->name]);

    $result = wp_insert_term($name, 'post_tag');
    if (is_wp_error($result))
        return new WP_Error('tag_failed', $result->get_error_message(), ['status' => 500]);

    $term = get_term($result['term_id'], 'post_tag');
    return rest_ensure_response(['success' => true, 'id' => $term->term_id, 'name' => $term->name]);
}
