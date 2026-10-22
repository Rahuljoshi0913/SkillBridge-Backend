
import { useState, useEffect } from "react";
import "./App.css";
import { apiRequest } from "./api";
import AdminDashboard from "./AdminDashboard";

function App() {
  const initialToken = new URLSearchParams(window.location.search).get("token") || "";
  console.log("Current URL:", window.location.href);
  console.log("Reset token exists:", Boolean(initialToken));

  const [page, setPage] = useState(
    initialToken ? "Reset Password" : "Dashboard"
  );
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [loggedInUser, setLoggedInUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("skillbridgeUser") || "null");
    } catch {
      return null;
    }
  });

  // Authentication states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Password reset states
  const [resetToken, setResetToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Skills states
  const [skills, setSkills] = useState([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skillsError, setSkillsError] = useState("");
  const [newSkill, setNewSkill] = useState("");
  const [addingSkill, setAddingSkill] = useState(false);

  // Projects states
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState("");

  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    required_skills: "",
  });
  const [creatingProject, setCreatingProject] = useState(false);

  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editProject, setEditProject] = useState({
    title: "",
    description: "",
    required_skills: "",
    status: "open",
  });
  const [updatingProject, setUpdatingProject] = useState(false);

  // Collaboration states
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState("");
  const [collaborationMessage, setCollaborationMessage] = useState("");
  const [sendingRequestId, setSendingRequestId] = useState(null);
  const [reviewingRequestId, setReviewingRequestId] = useState(null);

   // Load skills
  useEffect(() => {
    if (page !== "Explore Skills") return;

    let isActive = true;

    async function fetchSkills() {
      setSkillsLoading(true);
      setSkillsError("");

      try {
        const result = await apiRequest("/skills", undefined, "GET");

        if (isActive) {
          setSkills(Array.isArray(result.skills) ? result.skills : []);
        }
      } catch (error) {
        if (isActive) {
          setSkillsError(error.message || "Unable to load skills.");
        }
      } finally {
        if (isActive) setSkillsLoading(false);
      }
    }

    fetchSkills();

    return () => {
      isActive = false;
    };
  }, [page]);

  // Load projects
  useEffect(() => {
    if (page !== "Projects") return;

    let isActive = true;

    async function fetchProjects() {
      setProjectsLoading(true);
      setProjectsError("");

      try {
        const result = await apiRequest("/projects", undefined, "GET");

        if (isActive) {
          setProjects(Array.isArray(result.projects) ? result.projects : []);
        }
      } catch (error) {
        if (isActive) {
          setProjectsError(error.message || "Unable to load projects.");
        }
      } finally {
        if (isActive) setProjectsLoading(false);
      }
    }

    fetchProjects();

    return () => {
      isActive = false;
    };
  }, [page]);

  // Load collaboration requests
  useEffect(() => {
    if (page !== "Collaboration") return;

    let isActive = true;

    async function fetchReceivedRequests() {
      const token = sessionStorage.getItem("skillbridgeToken");

      if (!token) {
        setRequestsError("Please log in to view collaboration requests.");
        setRequestsLoading(false);
        return;
      }

      setRequestsLoading(true);
      setRequestsError("");

      try {
        const result = await apiRequest(
          "/collaboration/received",
          undefined,
          "GET",
          token
        );

        if (isActive) {
          setReceivedRequests(
            Array.isArray(result.requests) ? result.requests : []
          );
        }
      } catch (error) {
        if (isActive) {
          setRequestsError(
            error.message || "Unable to load collaboration requests."
          );
        }
      } finally {
        if (isActive) setRequestsLoading(false);
      }
    }

    fetchReceivedRequests();

    return () => {
      isActive = false;
    };
  }, [page]);

  // Input changes
  function handleInputChange(e) {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // Login and registration
  async function handleAuth(e, type) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const endpoint =
        type === "Register" ? "/auth/register" : "/auth/login";

      const data =
        type === "Register"
          ? formData
          : {
              email: formData.email,
              password: formData.password,
            };

      const result = await apiRequest(endpoint, data);

      if (type === "Login") {
        if (!result.token) {
          throw new Error("Login response did not contain a token.");
        }

        sessionStorage.setItem("skillbridgeToken", result.token);
        sessionStorage.setItem(
          "skillbridgeUser",
          JSON.stringify(result.user || {})
        );
        setLoggedInUser(result.user || null);

        setFormData({ name: "", email: "", password: "" });
        setActiveTab("Dashboard");
        setPage("Dashboard");
        setMessage("");
      } else {
        setFormData({ name: "", email: "", password: "" });
        setPage("Login");
        setMessage("Registration successful! Please log in.");
      }
    } catch (error) {
      setMessage(error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  // Request password reset email
  async function handleForgotPassword(e) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const result = await apiRequest(
        "/auth/forgot-password",
        { email: formData.email },
        "POST"
      );

      setMessage(
        result.message || "If your account exists, a reset link will be sent."
      );
    } catch (error) {
      setMessage(error.message || "Unable to request a password reset.");
    } finally {
      setLoading(false);
    }
  }

  // Set new password using the email reset token
  async function handleResetPassword(e) {
    e.preventDefault();
    setMessage("");

    if (!resetToken) {
      setMessage("Reset token is missing. Please request a new reset link.");
      return;
    }

    if (newPassword.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const result = await apiRequest(
        "/auth/reset-password",
        {
          token: resetToken,
          password: newPassword,
        },
        "POST"
      );

      setMessage(
        result.message || "Password reset successful. Please log in."
      );

      setNewPassword("");
      setConfirmPassword("");
      setResetToken("");

      // Remove the token from the browser URL.
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );

      setPage("Login");
    } catch (error) {
      setMessage(error.message || "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  }


function navigateTo(tab) {
  const token = sessionStorage.getItem("skillbridgeToken");

  const protectedPages = [
    "Explore Skills",
    "Projects",
    "Collaboration",
    "My Profile",
  ];

  if (protectedPages.includes(tab) && (!token || !loggedInUser)) {
    setMessage("Please log in to access this page.");
    setPage("Login");
    return;
  }

  setActiveTab(tab);
  setPage(tab);
  setMessage("");
}

  // Open login or registration
  function openAuthPage(authPage) {
    setMessage("");
    setFormData({ name: "", email: "", password: "" });
    setPage(authPage);
  }

  // Logout
  function logout() {
    sessionStorage.removeItem("skillbridgeToken");
    sessionStorage.removeItem("skillbridgeUser");
    setLoggedInUser(null);
    setActiveTab("Dashboard");
    setPage("Dashboard");
    setMessage("You have been logged out.");
  }

  // Add skill
  async function handleAddSkill(e) {
    e.preventDefault();

    const skillName = newSkill.trim();

    if (!skillName) {
      setSkillsError("Please enter a skill name.");
      return;
    }

    const token = sessionStorage.getItem("skillbridgeToken");

    if (!token) {
      setSkillsError("Please log in before adding a skill.");
      return;
    }

    setAddingSkill(true);
    setSkillsError("");

    try {
      const result = await apiRequest(
        "/skills",
        { name: skillName },
        "POST",
        token
      );

      if (result.skill) {
        setSkills((previous) =>
          [...previous, result.skill].sort((a, b) =>
            a.name.localeCompare(b.name)
          )
        );
      }

      setNewSkill("");
    } catch (error) {
      setSkillsError(error.message || "Unable to add skill.");
    } finally {
      setAddingSkill(false);
    }
  }

  // Create project
  async function handleCreateProject(e) {
    e.preventDefault();

    const token = sessionStorage.getItem("skillbridgeToken");

    if (!token) {
      setProjectsError("Please log in before creating a project.");
      return;
    }

    if (!newProject.title.trim()) {
      setProjectsError("Project title is required.");
      return;
    }

    setCreatingProject(true);
    setProjectsError("");

    try {
      const result = await apiRequest(
        "/projects",
        {
          title: newProject.title.trim(),
          description: newProject.description.trim(),
          required_skills: newProject.required_skills.trim(),
        },
        "POST",
        token
      );

      if (result.project) {
        setProjects((previous) => [result.project, ...previous]);
      } else {
        const refreshed = await apiRequest("/projects", undefined, "GET");
        setProjects(
          Array.isArray(refreshed.projects) ? refreshed.projects : []
        );
      }

      setNewProject({
        title: "",
        description: "",
        required_skills: "",
      });
    } catch (error) {
      setProjectsError(error.message || "Unable to create project.");
    } finally {
      setCreatingProject(false);
    }
  }

  // Update project
  async function handleUpdateProject(e, projectId) {
    e.preventDefault();

    const token = sessionStorage.getItem("skillbridgeToken");

    if (!token) {
      setProjectsError("Please log in before updating a project.");
      return;
    }

    if (!editProject.title.trim()) {
      setProjectsError("Project title is required.");
      return;
    }

    setUpdatingProject(true);
    setProjectsError("");

    try {
      const result = await apiRequest(
        `/projects/${projectId}`,
        {
          title: editProject.title.trim(),
          description: editProject.description.trim(),
          required_skills: editProject.required_skills.trim(),
          status: editProject.status,
        },
        "PATCH",
        token
      );

      if (result.project) {
        setProjects((previous) =>
          previous.map((project) =>
            Number(project.id) === Number(projectId)
              ? { ...project, ...result.project }
              : project
          )
        );
      } else {
        const refreshed = await apiRequest("/projects", undefined, "GET");
        setProjects(
          Array.isArray(refreshed.projects) ? refreshed.projects : []
        );
      }

      setEditingProjectId(null);
    } catch (error) {
      setProjectsError(error.message || "Unable to update project.");
    } finally {
      setUpdatingProject(false);
    }
  }

  // Delete project
  async function handleDeleteProject(projectId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this project?"
    );

    if (!confirmed) return;

    const token = sessionStorage.getItem("skillbridgeToken");

    if (!token) {
      setProjectsError("Please log in before deleting a project.");
      return;
    }

    setProjectsError("");

    try {
      await apiRequest(
        `/projects/${projectId}`,
        undefined,
        "DELETE",
        token
      );

      setProjects((previous) =>
        previous.filter(
          (project) => Number(project.id) !== Number(projectId)
        )
      );

      if (Number(editingProjectId) === Number(projectId)) {
        setEditingProjectId(null);
      }
    } catch (error) {
      setProjectsError(error.message || "Unable to delete project.");
    }
  }

  // Send collaboration request
  async function handleSendCollaborationRequest(projectId) {
    const token = sessionStorage.getItem("skillbridgeToken");

    if (!token) {
      setCollaborationMessage("Please log in to send a request.");
      return;
    }

    setSendingRequestId(projectId);
    setCollaborationMessage("");

    try {
      const result = await apiRequest(
        "/collaboration",
        {
          project_id: projectId,
          message: "Hi, I would like to collaborate on this project.",
        },
        "POST",
        token
      );

      setCollaborationMessage(
        result.message || "Collaboration request sent successfully!"
      );
    } catch (error) {
      setCollaborationMessage(
        error.message || "Unable to send collaboration request."
      );
    } finally {
      setSendingRequestId(null);
    }
  }

  // Accept or reject collaboration request
  async function handleReviewRequest(requestId, status) {
    const token = sessionStorage.getItem("skillbridgeToken");

    if (!token) {
      setRequestsError("Please log in to manage requests.");
      return;
    }

    setReviewingRequestId(requestId);
    setRequestsError("");

    try {
      const result = await apiRequest(
        `/collaboration/${requestId}/status`,
        { status },
        "PATCH",
        token
      );

      setReceivedRequests((previous) =>
        previous.map((request) =>
          Number(request.id) === Number(requestId)
            ? { ...request, status }
            : request
        )
      );

      setCollaborationMessage(
        result.message || `Request ${status} successfully.`
      );
    } catch (error) {
      setRequestsError(error.message || "Unable to update the request.");
    } finally {
      setReviewingRequestId(null);
    }
  }

  // Skills UI
  function renderSkills() {
    if (skillsLoading) {
      return <p>Loading skills from database...</p>;
    }

    if (skillsError) {
      return <p role="alert">{skillsError}</p>;
    }

    if (skills.length === 0) {
      return (
        <p>
          No skills found in the database yet. Add a skill using the form above.
        </p>
      );
    }

    return (
      <div className="stats-grid">
        {skills.map((skill) => (
          <article className="stat-card" key={skill.id}>
            <span>📚</span>
            <h3>{skill.name}</h3>
            <p>Explore and improve this skill.</p>
          </article>
        ))}
      </div>
    );
  }

  // Show the separate admin dashboard only for an authenticated admin.
  if (
    page === "Dashboard" &&
    String(loggedInUser?.role || "").toLowerCase() === "admin"
  ) {
    return <AdminDashboard onLogout={logout} />;
  }

  return (
    <div className="app">
    {page !== "Reset Password" && (
      <aside className="sidebar">
        <h2 className="logo">SkillBridge</h2>
          <nav>
            {[
              "Dashboard",
              ...(loggedInUser && sessionStorage.getItem("skillbridgeToken")
                ? ["Explore Skills", "Projects", "Collaboration", "My Profile"]
                : []),
            ].map((item) => (
            <button
              key={item}
              type="button"
              className={`nav-item ${activeTab === item ? "active" : ""}`}
              onClick={() => navigateTo(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="sidebar-auth">
          <button type="button" onClick={() => openAuthPage("Login")}>
            Login
          </button>

          <button type="button" onClick={() => openAuthPage("Register")}>
            Register
          </button>

          <button type="button" onClick={logout}>
            Logout
          </button>
        </div>

        <p className="sidebar-footer">Learn • Share • Grow</p>
      </aside>
    )}

      <main className="main-content">
        {/* Login */}
        {page === "Login" ? (
          <section className="auth-card">
            <h1>Welcome Back!</h1>
            <p>Login to continue your SkillBridge journey.</p>

            <form onSubmit={(e) => handleAuth(e, "Login")}>
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange}
                autoComplete="email"
                required
              />

              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
                autoComplete="current-password"
                required
              />

              <div style={{ textAlign: "right", margin: "8px 0 16px" }}>
                <button
                  type="button"
                  className="text-btn"
                  onClick={() => {
                    setMessage("");
                    setPage("Forgot Password");
                  }}
                >
                  Forgot Password?
                </button>
              </div>

              {message && <p role="status">{message}</p>}

              <button
                className="auth-submit"
                type="submit"
                disabled={loading}
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>

            <p>
              Don't have an account?{" "}
              <button
                type="button"
                className="text-btn"
                onClick={() => openAuthPage("Register")}
              >
                Register
              </button>
            </p>
          </section>
        ) : page === "Register" ? (
          /* Register */
          <section className="auth-card">
            <h1>Create Account</h1>
            <p>Join the SkillBridge community.</p>

            <form onSubmit={(e) => handleAuth(e, "Register")}>
              <label htmlFor="register-name">Full Name</label>
              <input
                id="register-name"
                name="name"
                type="text"
                placeholder="Enter your name"
                value={formData.name}
                onChange={handleInputChange}
                autoComplete="name"
                required
              />

              <label htmlFor="register-email">Email</label>
              <input
                id="register-email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange}
                autoComplete="email"
                required
              />

              <label htmlFor="register-password">Password</label>
              <input
                id="register-password"
                name="password"
                type="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleInputChange}
                autoComplete="new-password"
                minLength={8}
                required
              />

              {message && <p role="status">{message}</p>}

              <button
                className="auth-submit"
                type="submit"
                disabled={loading}
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>

            <p>
              Already registered?{" "}
              <button
                type="button"
                className="text-btn"
                onClick={() => openAuthPage("Login")}
              >
                Login
              </button>
            </p>
          </section>
        ) : page === "Forgot Password" ? (
          /* Forgot Password */
          <section className="auth-card">
            <h1 className="forgot-password-title">Forgot Password?</h1>
            <p>Enter your registered email to request a reset link.</p>

            <form onSubmit={handleForgotPassword}>
              <label htmlFor="forgot-email">Email</label>
              <input
                id="forgot-email"
                name="email"
                type="email"
                placeholder="Enter your registered email"
                value={formData.email}
                onChange={handleInputChange}
                autoComplete="email"
                required
              />

              {message && <p role="status">{message}</p>}

              <button
                className="auth-submit"
                type="submit"
                disabled={loading}
              >
                {loading ? "Sending request..." : "Send Reset Link"}
              </button>
            </form>

            <p>
              Remember your password?{" "}
              <button
                type="button"
                className="text-btn"
                onClick={() => openAuthPage("Login")}
              >
                Back to Login
              </button>
            </p>
          </section>
        ) : page === "Reset Password" ? (
          /* Reset Password */
          <section className="auth-card">
            <h1>Reset Password</h1>
            <p>Choose a new password for your SkillBridge account.</p>

            <form onSubmit={handleResetPassword}>
              <label htmlFor="new-password">New Password</label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                placeholder="Enter new password"
                required
              />

              <label htmlFor="confirm-password">Confirm Password</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                placeholder="Re-enter new password"
                required
              />

              {message && <p role="status">{message}</p>}

              <button
                className="auth-submit"
                type="submit"
                disabled={loading}
              >
                {loading ? "Updating password..." : "Reset Password"}
              </button>
            </form>

            <p>
              <button
                type="button"
                className="text-btn"
                onClick={() => openAuthPage("Login")}
              >
                Back to Login
              </button>
            </p>
          </section>
        ) : (
          <>
            <header className="topbar">
              <div>
                <h1>{activeTab}</h1>
                <p>Welcome to your SkillBridge workspace!</p>
              </div>
              <div className="avatar">S</div>
            </header>

            {/* Dashboard */}
            {page === "Dashboard" ? (
              <>
                <section className="welcome-card">
                  <div>
                    <p className="eyebrow">YOUR LEARNING JOURNEY</p>
                    <h2>Build skills. Build projects. Build your future.</h2>
                    <p>
                      Connect with learners, explore new skills, and collaborate
                      on exciting projects.
                    </p>
                    <button
                      className="primary-btn"
                      type="button"
                      onClick={() => navigateTo("Explore Skills")}
                    >
                      Explore Skills
                    </button>
                  </div>
                </section>

                <section className="stats-grid">
                  <article className="stat-card">
                    <span>📚</span>
                    <p>Available Skills</p>
                    <h2>Explore</h2>
                  </article>

                  <article className="stat-card">
                    <span>🚀</span>
                    <p>Projects</p>
                    <h2>Collaborate</h2>
                  </article>

                  <article className="stat-card">
                    <span>🤝</span>
                    <p>Community</p>
                    <h2>Connect</h2>
                  </article>
                </section>

                <section className="content-card">
                  <h2>Welcome to SkillBridge</h2>
                  <p>Your learning and collaboration journey starts here.</p>
                </section>
              </>
            ) : page === "Explore Skills" ? (
              /* Skills */
              <section className="content-card">
                <h2>Explore Skills</h2>

                <form onSubmit={handleAddSkill} className="add-skill-form">
                  <label htmlFor="new-skill">Add a new skill</label>
                  <div className="skill-input-row">
                    <input
                      id="new-skill"
                      type="text"
                      placeholder="e.g. React, Python, Node.js"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      maxLength={100}
                      required
                    />
                    <button type="submit" disabled={addingSkill}>
                      {addingSkill ? "Adding..." : "Add Skill"}
                    </button>
                  </div>
                </form>

                <p>Skills loaded from your SkillBridge database.</p>
                {renderSkills()}
              </section>
            ) : page === "Projects" ? (
              /* Projects */
              <section className="content-card">
                <h2>Projects</h2>
                <p>Explore projects and create your own project.</p>

                <form
                  onSubmit={handleCreateProject}
                  className="add-skill-form"
                >
                  <label htmlFor="project-title">Project Title</label>
                  <input
                    id="project-title"
                    type="text"
                    placeholder="e.g. Student Portfolio Website"
                    maxLength={200}
                    value={newProject.title}
                    onChange={(e) =>
                      setNewProject((previous) => ({
                        ...previous,
                        title: e.target.value,
                      }))
                    }
                    required
                  />

                  <label htmlFor="project-description">Description</label>
                  <textarea
                    id="project-description"
                    placeholder="Describe your project..."
                    value={newProject.description}
                    onChange={(e) =>
                      setNewProject((previous) => ({
                        ...previous,
                        description: e.target.value,
                      }))
                    }
                  />

                  <label htmlFor="project-skills">Required Skills</label>
                  <input
                    id="project-skills"
                    type="text"
                    placeholder="React, Node.js, MySQL"
                    value={newProject.required_skills}
                    onChange={(e) =>
                      setNewProject((previous) => ({
                        ...previous,
                        required_skills: e.target.value,
                      }))
                    }
                  />

                  <button type="submit" disabled={creatingProject}>
                    {creatingProject ? "Creating..." : "Create Project"}
                  </button>
                </form>

                {projectsError && <p role="alert">{projectsError}</p>}

                <div className="project-list">
                  <h3>Available Projects</h3>

                  {projectsLoading ? (
                    <p>Loading projects...</p>
                  ) : projects.length === 0 ? (
                    <p>No projects found yet. Create your first project!</p>
                  ) : (
                    projects.map((project) => (
                      <article className="stat-card" key={project.id}>
                        <h3>{project.title}</h3>
                        <p>
                          {project.description || "No description provided."}
                        </p>
                        <p>
                          <strong>Required Skills:</strong>{" "}
                          {project.required_skills || "Not specified"}
                        </p>
                        <p>
                          <strong>Owner:</strong>{" "}
                          {project.owner_name || "Project creator"}
                        </p>
                        <p>
                          <strong>Status:</strong> {project.status || "open"}
                        </p>

                        <button
                          type="button"
                          disabled={sendingRequestId !== null}
                          onClick={() =>
                            handleSendCollaborationRequest(project.id)
                          }
                        >
                          {Number(sendingRequestId) === Number(project.id)
                            ? "Sending..."
                            : "Send Collaboration Request"}
                        </button>

                        {collaborationMessage && (
                          <p role="status">{collaborationMessage}</p>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setProjectsError("");
                            setEditingProjectId(project.id);
                            setEditProject({
                              title: project.title || "",
                              description: project.description || "",
                              required_skills: project.required_skills || "",
                              status: project.status || "open",
                            });
                          }}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteProject(project.id)}
                        >
                          Delete
                        </button>

                        {editingProjectId === project.id && (
                          <form
                            className="add-skill-form"
                            onSubmit={(e) =>
                              handleUpdateProject(e, project.id)
                            }
                          >
                            <h4>Edit Project</h4>

                            <label htmlFor={`edit-title-${project.id}`}>
                              Project Title
                            </label>
                            <input
                              id={`edit-title-${project.id}`}
                              type="text"
                              maxLength={200}
                              value={editProject.title}
                              onChange={(e) =>
                                setEditProject((previous) => ({
                                  ...previous,
                                  title: e.target.value,
                                }))
                              }
                              required
                            />

                            <label
                              htmlFor={`edit-description-${project.id}`}
                            >
                              Description
                            </label>
                            <textarea
                              id={`edit-description-${project.id}`}
                              value={editProject.description}
                              onChange={(e) =>
                                setEditProject((previous) => ({
                                  ...previous,
                                  description: e.target.value,
                                }))
                              }
                            />

                            <label htmlFor={`edit-skills-${project.id}`}>
                              Required Skills
                            </label>
                            <input
                              id={`edit-skills-${project.id}`}
                              type="text"
                              value={editProject.required_skills}
                              onChange={(e) =>
                                setEditProject((previous) => ({
                                  ...previous,
                                  required_skills: e.target.value,
                                }))
                              }
                            />

                            <label htmlFor={`edit-status-${project.id}`}>
                              Project Status
                            </label>
                            <select
                              id={`edit-status-${project.id}`}
                              value={editProject.status}
                              onChange={(e) =>
                                setEditProject((previous) => ({
                                  ...previous,
                                  status: e.target.value,
                                }))
                              }
                            >
                              <option value="open">Open</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                            </select>

                            <button
                              type="submit"
                              disabled={updatingProject}
                            >
                              {updatingProject ? "Saving..." : "Save Changes"}
                            </button>

                            <button
                              type="button"
                              disabled={updatingProject}
                              onClick={() => setEditingProjectId(null)}
                            >
                              Cancel
                            </button>
                          </form>
                        )}
                      </article>
                    ))
                  )}
                </div>
              </section>
            ) : page === "Collaboration" ? (
              /* Collaboration */
              <section className="content-card">
                <h2>Collaboration Requests</h2>
                <p>Manage requests received for your projects.</p>

                {collaborationMessage && (
                  <p role="status">{collaborationMessage}</p>
                )}
                {requestsError && <p role="alert">{requestsError}</p>}

                {requestsLoading ? (
                  <p>Loading collaboration requests...</p>
                ) : receivedRequests.length === 0 ? (
                  <p>No collaboration requests received yet.</p>
                ) : (
                  <div className="project-list">
                    {receivedRequests.map((request) => (
                      <article className="stat-card" key={request.id}>
                        <h3>{request.project_title}</h3>
                        <p>
                          <strong>Requested by:</strong>{" "}
                          {request.requester_name}
                        </p>
                        <p>
                          <strong>Message:</strong>{" "}
                          {request.message || "No message provided."}
                        </p>
                        <p>
                          <strong>Status:</strong> {request.status}
                        </p>

                        {request.status === "pending" && (
                          <>
                            <button
                              type="button"
                              disabled={reviewingRequestId !== null}
                              onClick={() =>
                                handleReviewRequest(request.id, "accepted")
                              }
                            >
                              {Number(reviewingRequestId) ===
                              Number(request.id)
                                ? "Processing..."
                                : "Accept"}
                            </button>

                            <button
                              type="button"
                              disabled={reviewingRequestId !== null}
                              onClick={() =>
                                handleReviewRequest(request.id, "rejected")
                              }
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            ) : page === "My Profile" ? (
              /* Profile */
              <section className="content-card">
                <h2>My Profile</h2>
                {(() => {
                  let user = {};

                  try {
                    user = JSON.parse(
                      sessionStorage.getItem("skillbridgeUser") || "{}"
                    );
                  } catch {
                    user = {};
                  }

                  return (
                    <div>
                      <p>
                        <strong>Name:</strong> {user.name || "Not logged in"}
                      </p>
                      <p>
                        <strong>Email:</strong> {user.email || "Not available"}
                      </p>
                      <p>
                        <strong>Role:</strong> {user.role || "Not available"}
                      </p>
                    </div>
                  );
                })()}
              </section>
            ) : null}
          </>
        )}
      </main>
    </div>
  );

// export default App;

}

export default App;
