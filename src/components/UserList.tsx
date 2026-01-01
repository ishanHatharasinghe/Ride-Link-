import { useEffect, useState } from "react";

type User = {
  uid: string;
  email: string;
  provider: string;
  createdAt: string;
  lastSignIn: string;
};

const UsersList = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 🔗 Local emulator URL
    const url = "http://127.0.0.1:5001/ridelink-26c32/us-central1/getUsers";

    fetch(url)
      .then((res) => {
        if (!res.ok) {
          return res.json().then((err) => {
            throw new Error(err.error || "Failed to fetch users");
          });
        }
        return res.json();
      })
      .then((data) => {
        setUsers(data);
      })
      .catch((err) => {
        console.error("Error fetching users:", err);
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading users...</p>;
  if (error)
    return (
      <p style={{ color: "red" }}>
        <strong>Error:</strong> {error}
      </p>
    );

  return (
    <div style={{ padding: 20 }}>
      <h2>Authenticated Users</h2>
      <table
        border={1}
        cellPadding="8"
        style={{ width: "100%", borderCollapse: "collapse" }}
      >
        <thead>
          <tr>
            <th>Email</th>
            <th>Provider</th>
            <th>Created</th>
            <th>Last Sign-In</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.uid}>
              <td>{u.email}</td>
              <td>{u.provider}</td>
              <td>{u.createdAt}</td>
              <td>{u.lastSignIn}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UsersList;
