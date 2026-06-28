// Centralized Supabase Database & Auth Engine

const SUPABASE_URL = 'https://ntbjaofhajysvfekvjqy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50Ymphb2ZoYWp5c3ZmZWt2anF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NTc1NDgsImV4cCI6MjA5ODIzMzU0OH0.8J5fgummw2n-eYQtcZj31RnlDdyCP1wbhUJ8XYpkkKs';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const SESSION_KEY = 'mrh_current_user';

function getCurrentUser() {
    const u = localStorage.getItem(SESSION_KEY);
    return u ? JSON.parse(u) : null;
}

function setCurrentUser(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function logout() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = 'index.html';
}

async function login(username, password) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

    if (error || !data) {
        return false;
    }

    const userObj = {
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        username: data.username,
        email: data.email,
        mobile: data.mobile,
        role: data.role
    };

    setCurrentUser(userObj);

    if (userObj.role === 'admin') {
        window.location.href = 'admin_dashboard.html';
    } else {
        window.location.href = 'dashboard.html';
    }
    return true;
}

async function signup(formData) {
    // Check duplicates
    const { data: existing } = await supabase
        .from('users')
        .select('id')
        .or(`username.eq.${formData.username},email.eq.${formData.email}`);

    if (existing && existing.length > 0) {
        return { success: false, message: 'Username or email already exists online.' };
    }

    const { data, error } = await supabase
        .from('users')
        .insert([{
            first_name: formData.firstName,
            last_name: formData.lastName,
            username: formData.username,
            email: formData.email,
            mobile: formData.mobile,
            password: formData.password,
            role: 'user'
        }])
        .select()
        .single();

    if (error || !data) {
        return { success: false, message: 'Online registration failed. Please check your Supabase tables.' };
    }

    const userObj = {
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        username: data.username,
        email: data.email,
        mobile: data.mobile,
        role: data.role
    };

    setCurrentUser(userObj);
    window.location.href = 'dashboard.html';
    return { success: true };
}

async function createReport(reportData, imageFile, callback) {
    const user = getCurrentUser();
    if (!user) return;

    const processSave = async (base64Img) => {
        const { error } = await supabase
            .from('reports')
            .insert([{
                user_id: user.id,
                citizen_name: `${user.firstName} ${user.lastName}`,
                citizen_contact: user.mobile || user.email,
                issue_type: reportData.issueType,
                location: reportData.location,
                description: reportData.description,
                image: base64Img || null,
                status: 'Pending',
                date: new Date().toISOString().split('T')[0]
            }]);

        if (error) {
            callback({ success: false });
        } else {
            callback({ success: true });
        }
    };

    if (imageFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            processSave(e.target.result);
        };
        reader.readAsDataURL(imageFile);
    } else {
        processSave(null);
    }
}

async function getReports(userId = null) {
    let query = supabase.from('reports').select('*').order('created_at', { ascending: false });
    if (userId) {
        query = query.eq('user_id', userId);
    }
    const { data, error } = await query;
    return data || [];
}

async function updateReportStatus(reportId, newStatus) {
    const { error } = await supabase
        .from('reports')
        .update({ status: newStatus })
        .eq('id', reportId);

    return !error;
}
