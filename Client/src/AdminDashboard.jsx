
import { useEffect, useState } from "react";
import { apiRequest } from "./api";
import "./AdminDashboard.css";

function AdminDashboard({ onLogout }) {
  const [admin, setAdmin] = useState(null);
  const [users, setUsers] = useState([]);
  const [skills, setSkills] = useState([]);
  const [projects, setProjects] = useState([]);
  const [collaborationRequests, setCollaborationRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [updatingRequestId, setUpdatingRequestId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("Dashboard");

  
  const [deletingUserId, setDeletingUserId] = useState(null);

  
const [newSkillName, setNewSkillName] = useState("");
const [addingSkill, setAddingSkill] = useState(false);
const [newProject, setNewProject] = useState({
  user_id: "",
  title: "",
  description: "",
  required_skills: "",
  status: "open",
});

const [addingProject, setAddingProject] = useState(false);
async function fetchCollaborationRequests() {
  try {
    setLoadingRequests(true);

    const token = sessionStorage.getItem("skillbridgeToken");

    const result = await apiRequest(
      "/admin/collaboration-requests",
      undefined,
      "GET",
      token
    );

    setCollaborationRequests(result.requests || []);
  } catch (err) {
    alert(err.message || "Unable to load collaboration requests.");
  } finally {
    setLoadingRequests(false);
  }
}
async function handleUpdateRequestStatus(request, status) {
  const action = status === "accepted" ? "accept" : "reject";

  const confirmed = window.confirm(
    `Are you sure you want to ${action} this collaboration request?`
  );

  if (!confirmed) return;

  try {
    setUpdatingRequestId(request.id);

    const token = sessionStorage.getItem("skillbridgeToken");

    await apiRequest(
      `/admin/collaboration-requests/${request.id}`,
      { status },
      "PUT",
      token
    );

    setCollaborationRequests((currentRequests) =>
      currentRequests.map((item) =>
        item.id === request.id ? { ...item, status } : item
      )
    );

    alert(`Request ${action}ed successfully!`);
  } catch (err) {
    alert(err.message || "Unable to update collaboration request.");
  } finally {
    setUpdatingRequestId(null);
  }
}

async function handleDeleteCollaborationRequest(request) {
  const confirmed = window.confirm(
    `Are you sure you want to delete collaboration request #${request.id}?`
  );

  if (!confirmed) return;

  try {
    setUpdatingRequestId(request.id);

    const token = sessionStorage.getItem("skillbridgeToken");

    await apiRequest(
      `/admin/collaboration-requests/${request.id}`,
      undefined,
      "DELETE",
      token
    );

    setCollaborationRequests((currentRequests) =>
      currentRequests.filter((item) => item.id !== request.id)
    );

    alert("Collaboration request deleted successfully!");
  } catch (err) {
    alert(err.message || "Unable to delete collaboration request.");
  } finally {
    setUpdatingRequestId(null);
  }
}

async function handleAddSkill(event) {
  event.preventDefault();

  const name = newSkillName.trim();

  if (!name) {
    alert("Please enter a skill name.");
    return;
  }

  try {
    setAddingSkill(true);

    const token = sessionStorage.getItem("skillbridgeToken");

    const result = await apiRequest(
      "/admin/skills",
      { name },
      "POST",
      token
    );

    setSkills((currentSkills) => [
      result.skill,
      ...currentSkills,
    ]);

    setNewSkillName("");
    alert("Skill added successfully!");
  } catch (err) {
    alert(err.message || "Unable to add skill.");
  } finally {
    setAddingSkill(false);
  }
}


async function handleDeleteSkill(skill) {
  const confirmed = window.confirm(
    `Are you sure you want to delete "${skill.name}"?`
  );

  if (!confirmed) return;

  try {
    const token = sessionStorage.getItem("skillbridgeToken");

    await apiRequest(
      `/admin/skills/${skill.id}`,
      undefined,
      "DELETE",
      token
    );

    setSkills((currentSkills) =>
      currentSkills.filter(
        (currentSkill) => currentSkill.id !== skill.id
      )
    );

    alert("Skill deleted successfully!");
  } catch (err) {
    alert(err.message || "Unable to delete skill.");
  }
};
async function handleEditSkill(skill) {
  const name = window.prompt("Enter skill name:", skill.name);

  if (name === null) return;

  if (!name.trim()) {
    alert("Skill name is required.");
    return;
  }

  try {
    const token = sessionStorage.getItem("skillbridgeToken");

    const result = await apiRequest(
      `/admin/skills/${skill.id}`,
      { name: name.trim() },
      "PUT",
      token
    );

    setSkills((currentSkills) =>
      currentSkills.map((item) =>
        item.id === skill.id ? result.skill : item
      )
    );

    alert("Skill updated successfully!");
  } catch (err) {
    alert(err.message || "Unable to update skill.");
  }
}

async function handleAddProject(event) {
  event.preventDefault();

  if (!newProject.user_id || !newProject.title.trim()) {
    alert("Please select a user and enter a project title.");
    return;
  }

  try {
    setAddingProject(true);

    const token = sessionStorage.getItem("skillbridgeToken");

    const result = await apiRequest(
      "/admin/projects",
      {
        ...newProject,
        user_id: Number(newProject.user_id),
      },
      "POST",
      token
    );

    setProjects((currentProjects) => [
      result.project,
      ...currentProjects,
    ]);

    setNewProject({
      user_id: "",
      title: "",
      description: "",
      required_skills: "",
      status: "open",
    });

    alert("Project added successfully!");
  } catch (err) {
    alert(err.message || "Unable to add project.");
  } finally {
    setAddingProject(false);
  }
}

async function handleDeleteProject(project) {
  const confirmed = window.confirm(
    `Are you sure you want to delete "${project.title}"?`
  );

  if (!confirmed) return;

  try {
    const token = sessionStorage.getItem("skillbridgeToken");

    await apiRequest(
      `/admin/projects/${project.id}`,
      undefined,
      "DELETE",
      token
    );

    setProjects((currentProjects) =>
      currentProjects.filter((item) => item.id !== project.id)
    );

    alert("Project deleted successfully!");
  } catch (err) {
    alert(err.message || "Unable to delete project.");
  }
}


async function handleDeleteUser(user) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${user.name} (${user.email})?`
    );

    if (!confirmed) return;

    try {
      setDeletingUserId(user.id);
      setError("");

      const token = sessionStorage.getItem("skillbridgeToken");

      await apiRequest(
        `/admin/users/${user.id}`,
        undefined,
        "DELETE",
        token
      );

      setUsers((currentUsers) =>
        currentUsers.filter((currentUser) => currentUser.id !== user.id)
      );

      // Refresh dashboard statistics
      const dashboardData = await apiRequest(
        "/admin/dashboard",
        undefined,
        "GET",
        token
      );

      setAdmin(dashboardData);

      alert("User deleted successfully!");
    } catch (err) {
      alert(err.message || "Unable to delete user.");
    } finally {
      setDeletingUserId(null);
    }
  }
  
async function handleEditProject(project) {
  const title = window.prompt("Enter project title:", project.title);

  if (title === null) return;

  if (!title.trim()) {
    alert("Project title is required.");
    return;
  }

  const description = window.prompt(
    "Enter project description:",
    project.description || ""
  );

  if (description === null) return;

  const required_skills = window.prompt(
    "Enter required skills:",
    project.required_skills || ""
  );

  if (required_skills === null) return;

  const status = window.prompt(
    "Enter status: open, in_progress, or completed",
    project.status || "open"
  );

  if (status === null) return;

  if (!["open", "in_progress", "completed"].includes(status)) {
    alert("Invalid status. Use open, in_progress, or completed.");
    return;
  }

  try {
    const token = sessionStorage.getItem("skillbridgeToken");

    const result = await apiRequest(
      `/admin/projects/${project.id}`,
      {
        title: title.trim(),
        description,
        required_skills,
        status,
      },
      "PUT",
      token
    );

    setProjects((currentProjects) =>
      currentProjects.map((item) =>
        item.id === project.id ? result.project : item
      )
    );

    alert("Project updated successfully!");
  } catch (err) {
    alert(err.message || "Unable to update project.");
  }
}



  useEffect(() => {
    async function fetchAdminDashboard() {
      try {
        const token = sessionStorage.getItem("skillbridgeToken");

        if (!token) {
          throw new Error("Please login as an admin.");
        }

        const data = await apiRequest(
          "/admin/dashboard",
          undefined,
          "GET",
          token
        );

        setAdmin(data);

        const usersData = await apiRequest(
          "/admin/users",
          undefined,
          "GET",
          token
        );
        setUsers(usersData.users || []);

        const skillsData = await apiRequest(
          "/admin/skills",
          undefined,
          "GET",
          token
        );
        setSkills(skillsData.skills || []);

        const projectsData = await apiRequest(
          "/admin/projects",
          undefined,
          "GET",
          token
        );
        setProjects(projectsData.projects || []);
      } catch (err) {
        setError(err.message || "Failed to load admin dashboard.");
      } finally {
        setLoading(false);
      }
    }

    fetchAdminDashboard();
  }, []);

  if (loading) {
    return (
      <div className="admin-loading">
        Loading Admin Dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-error">
        <h2>Unable to Load Dashboard</h2>
        <p>{error}</p>
        <p>Check your login token and backend server.</p>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <h2 className="admin-logo">SkillBridge</h2>
        <p className="admin-label">ADMIN PANEL</p>

        <nav className="admin-nav">
          {[
              "Dashboard",
              "Users",
              "Skills",
              "Projects",
              "Collaboration Requests",
            ].map((tab) => (
            <button
              key={tab}
              className={`admin-nav-item ${
                activeTab === tab ? "active" : ""
              }`}
              onClick={() => {
                setActiveTab(tab);

                if (tab === "Collaboration Requests") {
                  fetchCollaborationRequests();
                }
              }}
            >
              {tab}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          Administration Panel
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <h1>{activeTab === "Dashboard" ? "Admin Dashboard" : activeTab}</h1>
            <p>Manage and monitor SkillBridge.</p>
          </div>

         <div className="admin-profile">
        <div className="admin-avatar">A</div>
        <span>Administrator</span>

        <button 
            type="button"
            className="admin-logout-btn"
            onClick={onLogout}
        >
            Logout
        </button>
        </div>
        </header>

        {activeTab === "Dashboard" && (
          <>
            <section className="admin-welcome">
              <p className="admin-eyebrow">WELCOME BACK</p>
              <h2>Welcome to SkillBridge Admin Panel!</h2>
              <p>
                Manage your platform and keep everything organized
                from one place.
              </p>
            </section>

            <section className="admin-stats">
              <article className="admin-stat-card">
                <span className="admin-stat-icon">👥</span>
                <h3>Users</h3>
                <p>User management</p>
                <span className="admin-status">
                  Total: {admin?.stats?.totalUsers ?? 0}
                </span>
              </article>

              <article className="admin-stat-card">
                <span className="admin-stat-icon">📚</span>
                <h3>Skills</h3>
                <p>Skill management</p>
                <span className="admin-status">
                  Total: {admin?.stats?.totalSkills ?? 0}
                </span>
              </article>

              <article className="admin-stat-card">
                <span className="admin-stat-icon">🚀</span>
                <h3>Projects</h3>
                <p>Project management</p>
                <span className="admin-status">
                  Total: {admin?.stats?.totalProjects ?? 0}
                </span>
              </article>
            </section>

            <section className="admin-content-card">
              <h2>Admin Account</h2>
              <p>
                <strong>Message:</strong>{" "}
                {admin?.message || "Dashboard loaded successfully"}
              </p>
              <p>
                <strong>Admin ID:</strong>{" "}
                {admin?.adminId ?? "Not available"}
              </p>
              <p>Your admin dashboard is connected to the backend.</p>
            </section>
          </>
        )}

        {activeTab === "Users" && (
          <section className="admin-content-card">
            <h2>All Users</h2>

            {users.length === 0 ? (
              <p>No users found.</p>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-users-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>{user.id}</td>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td>{user.role}</td>
                       
                        <td>
                        {String(user.role).toLowerCase() !== "admin" &&
                            Number(user.id) !== Number(admin?.adminId) && (
                            <button
                                type="button"
                                className="admin-delete-btn"
                                onClick={() => handleDeleteUser(user)}
                                disabled={deletingUserId === user.id}
                            >
                                {deletingUserId === user.id ? "Deleting..." : "Delete"}
                            </button>
                            )}
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeTab === "Skills" && (
          <section className="admin-content-card">
            <h2>All Skills</h2>
            
            <form onSubmit={handleAddSkill} className="admin-add-skill-form">
            <input
                type="text"
                value={newSkillName}
                onChange={(event) => setNewSkillName(event.target.value)}
                placeholder="Enter skill name"
                required
            />

            <button type="submit" disabled={addingSkill}>
                {addingSkill ? "Adding..." : "Add Skill"}
            </button>
            </form>


            {skills.length === 0 ? (
              <p>No skills found.</p>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-users-table">
        
                  <thead>
                    <tr>
                      {Object.keys(skills[0]).map((key) => (
                        <th key={key}>{key}</th>
                      ))}
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                  
                    {skills.map((skill, index) => (
                    <tr key={skill.id ?? index}>
                        {Object.keys(skills[0]).map((key) => (
                        <td key={key}>
                            {skill[key] == null
                            ? "-"
                            : typeof skill[key] === "object"
                                ? JSON.stringify(skill[key])
                                : String(skill[key])}
                        </td>
                        ))}

                        <td>
                          <button
                          type="button"
                          className="admin-edit-btn"
                          onClick={() => handleEditSkill(skill)}
                        >
                          Edit
                        </button>
                        <button
                            type="button"
                            className="admin-delete-btn"
                            onClick={() => handleDeleteSkill(skill)}
                        >
                            Delete
                        </button>
                        </td>
                    </tr>
                    ))}

                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeTab === "Projects" && (
          <section className="admin-content-card">
            <h2>All Projects</h2>

            
<form onSubmit={handleAddProject} className="admin-add-project-form">
  <select
    value={newProject.user_id}
    onChange={(event) =>
      setNewProject((current) => ({
        ...current,
        user_id: event.target.value,
      }))
    }
    required
  >
    <option value="">Select project owner</option>
    {users
      .filter(
        (user) => String(user.role).toLowerCase() !== "admin"
      )
      .map((user) => (
        <option key={user.id} value={user.id}>
          {user.name} ({user.email})
        </option>
      ))}
  </select>

  <input
    type="text"
    maxLength={200}
    value={newProject.title}
    onChange={(event) =>
      setNewProject((current) => ({
        ...current,
        title: event.target.value,
      }))
    }
    placeholder="Project title"
    required
  />

  <textarea
    value={newProject.description}
    onChange={(event) =>
      setNewProject((current) => ({
        ...current,
        description: event.target.value,
      }))
    }
    placeholder="Project description"
  />

  <input
    type="text"
    maxLength={500}
    value={newProject.required_skills}
    onChange={(event) =>
      setNewProject((current) => ({
        ...current,
        required_skills: event.target.value,
      }))
    }
    placeholder="Required skills (e.g. React, Node.js)"
  />

  <select
    value={newProject.status}
    onChange={(event) =>
      setNewProject((current) => ({
        ...current,
        status: event.target.value,
      }))
    }
  >
    <option value="open">Open</option>
    <option value="in_progress">In Progress</option>
    <option value="completed">Completed</option>
  </select>

  <button
    type="submit"
    disabled={
      addingProject ||
      !users.some(
        (user) => String(user.role).toLowerCase() !== "admin"
      )
    }
  >
    {addingProject ? "Adding..." : "Add Project"}
  </button>
</form>

{!users.some(
  (user) => String(user.role).toLowerCase() !== "admin"
) && (
  <p>Please register a normal user before adding a project.</p>
)}

            

            {projects.length === 0 ? (
              <p>No projects found.</p>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-users-table">
                  <thead>
                    <tr>
                      {Object.keys(projects[0]).map((key) => (
                        <th key={key}>{key}</th>
                      ))}
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project, index) => (
                      <tr key={project.id ?? index}>
                        {Object.keys(projects[0]).map((key) => (
                          <td key={key}>
                            {project[key] == null
                              ? "-"
                              : typeof project[key] === "object"
                                ? JSON.stringify(project[key])
                                : String(project[key])}
                          </td>
                          
                        ))}
                        <td>
                          
                        <button
                          type="button"
                          className="admin-edit-btn"
                          onClick={() => handleEditProject(project)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="admin-delete-btn"
                          onClick={() => handleDeleteProject(project)}
                        >
                          Delete
                        </button>
                      </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
          {activeTab === "Collaboration Requests" && (
  <section className="admin-content-card">
    <h2>Collaboration Requests</h2>
    <p>Manage project collaboration requests.</p>

    <button
      type="button"
      onClick={fetchCollaborationRequests}
      disabled={loadingRequests}
    >
      {loadingRequests ? "Loading..." : "Refresh Requests"}
    </button>

    {loadingRequests ? (
      <p>Loading collaboration requests...</p>
    ) : collaborationRequests.length === 0 ? (
      <p>No collaboration requests found.</p>
    ) : (
      <div className="admin-table-wrapper">
        <table className="admin-users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Project</th>
              <th>Requester</th>
              <th>Email</th>
              <th>Message</th>
              <th>Status</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {collaborationRequests.map((request) => (
              <tr key={request.id}>
                <td>{request.id}</td>
                <td>{request.project_title || `Project #${request.project_id}`}</td>
                <td>{request.requester_name || `User #${request.requester_id}`}</td>
                <td>{request.requester_email || "-"}</td>
                <td>{request.message || "-"}</td>
                <td>{request.status}</td>
                <td>
                  {request.created_at
                    ? new Date(request.created_at).toLocaleString()
                    : "-"}
                </td>

                <td>
                  <button
                    type="button"
                    className="admin-edit-btn"
                    disabled={
                      updatingRequestId === request.id ||
                      request.status === "accepted"
                    }
                    onClick={() =>
                      handleUpdateRequestStatus(request, "accepted")
                    }
                  >
                    Accept
                  </button>

                  <button
                    type="button"
                    className="admin-edit-btn"
                    disabled={
                      updatingRequestId === request.id ||
                      request.status === "rejected"
                    }
                    onClick={() =>
                      handleUpdateRequestStatus(request, "rejected")
                    }
                  >
                    Reject
                  </button>

                  <button
                    type="button"
                    className="admin-delete-btn"
                    disabled={updatingRequestId === request.id}
                    onClick={() =>
                      handleDeleteCollaborationRequest(request)
                    }
                  >
                    {updatingRequestId === request.id
                      ? "Processing..."
                      : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
)}


      </main>
    </div>
  );
}

export default AdminDashboard;
