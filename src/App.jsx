import "./App.css"
import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

// Ensure Tailwind CSS is loaded
// <script src="https://cdn.tailwindcss.com"></script>
// <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />

// --- API Utility Functions ---
const fetchData = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error; // Re-throw to be caught by component's error state
  }
};

// --- Components ---

// Sidebar Component
const Sidebar = () => {
  return (
    <div className="w-64 bg-gray-800 text-white flex flex-col p-6 shadow-xl rounded-r-xl">
      <div className="text-3xl font-bold mb-8 text-blue-300">My Dashboard</div>
      <nav className="flex-grow">
        <ul>
          <li className="mb-4">
            <Link to="/" className="flex items-center p-3 rounded-lg hover:bg-gray-700 transition-colors duration-200">
              <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001 1h2a1 1 0 001-1m-6 0h4"></path></svg>
              <span className="text-lg">Dashboard</span>
            </Link>
          </li>
          {/* Add more static links here if needed, e.g., to a separate settings page */}
        </ul>
      </nav>
      <div className="mt-auto text-sm text-gray-400">
        <p>&copy; 2024 My App</p>
      </div>
    </div>
  );
};

// Chart Components
const PostsPerUserChart = ({ users, posts }) => {
  // Calculate posts per user
  const data = useMemo(() => {
    const userPostCounts = {};
    posts.forEach(post => {
      userPostCounts[post.userId] = (userPostCounts[post.userId] || 0) + 1;
    });

    return users.map(user => ({
      name: user.name,
      posts: userPostCounts[user.id] || 0,
    })).sort((a, b) => b.posts - a.posts); // Sort by post count descending
  }, [users, posts]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg h-[400px] flex flex-col">
      <h3 className="text-xl font-semibold text-gray-700 mb-4 text-center">Posts per User</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fontSize: 12 }} />
          <YAxis />
          <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
          <Bar dataKey="posts" fill="#8884d8" radius={[10, 10, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const PostTitleLengthChart = ({ posts }) => {
  // Calculate title length distribution
  const data = useMemo(() => {
    const lengthCounts = {};
    posts.forEach(post => {
      const length = post.title.length;
      const bucket = Math.floor(length / 10) * 10; // Group by tens (0-9, 10-19, etc.)
      const bucketLabel = `${bucket}-${bucket + 9}`;
      lengthCounts[bucketLabel] = (lengthCounts[bucketLabel] || 0) + 1;
    });

    // Convert to array and sort by bucket number
    return Object.keys(lengthCounts)
      .map(key => ({
        range: key,
        count: lengthCounts[key],
        sortKey: parseInt(key.split('-')[0]) // For sorting
      }))
      .sort((a, b) => a.sortKey - b.sortKey);
  }, [posts]);

  const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF', '#FF6B6B', '#6A0572', '#2C3E50'];

	// NEW: Prepare legend payload with custom colors
  const legendPayload = useMemo(() => {
    return data.map((entry, index) => ({
      id: entry.range, // Unique ID for the legend item
      value: entry.range, // Text to display in the legend
      type: 'square', // Type of icon (e.g., 'square', 'circle')
      color: PIE_COLORS[index % PIE_COLORS.length], // The color for this legend item
    }));
  }, [data, PIE_COLORS]); // Depend on data and PIE_COLORS

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg h-[400px] flex flex-col">
      <h3 className="text-xl font-semibold text-gray-700 mb-4 text-center">Post Title Length Distribution</h3>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={120}
            fill="#8884d8"
            dataKey="count"
            nameKey="range"
            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
          >
            {
              data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))
            }
          </Pie>
          <Tooltip />
	  {/* <Legend wrapperStyle={{ paddingTop: '20px' }} /> */}
	  {/* UPDATED: Pass custom payload to the Legend */}
          <Legend wrapperStyle={{ paddingTop: '20px' }} payload={legendPayload} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};


// Dashboard View Component
const Dashboard = () => {
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [fetchedPosts, fetchedUsers] = await Promise.all([
          fetchData('https://jsonplaceholder.typicode.com/posts'),
          fetchData('https://jsonplaceholder.typicode.com/users')
        ]);
        setPosts(fetchedPosts);
        setUsers(fetchedUsers);
      } catch (err) {
        setError("Failed to load dashboard data. " + err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <div className="flex justify-center items-center h-full text-xl text-gray-600">Loading dashboard...</div>;
  if (error) return <div className="text-red-500 text-center text-xl">Error: {error}</div>;

  return (
    <div className="p-8 flex-grow overflow-auto">
      <h2 className="text-3xl font-bold text-gray-800 mb-8">Dashboard Overview</h2>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <PostsPerUserChart users={users} posts={posts} />
        <PostTitleLengthChart posts={posts} />
      </div>

      {/* Posts List Section */}
      <h3 className="text-2xl font-semibold text-gray-800 mb-6">All Posts</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map(post => (
          <Link
            key={post.id}
            to={`/posts/${post.id}`}
            className="block bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-200 cursor-pointer"
          >
            <h4 className="text-xl font-semibold text-blue-700 mb-2 truncate">{post.title}</h4>
            <p className="text-gray-600 text-sm">By: {users.find(u => u.id === post.userId)?.name || 'Unknown User'}</p>
            <p className="text-gray-500 text-sm mt-2 line-clamp-2">{post.body}</p>
            <span className="text-blue-500 hover:underline text-sm mt-3 inline-block">View Details &rarr;</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

// Post Detail Component
const PostDetail = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPostDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedPost = await fetchData(`https://jsonplaceholder.typicode.com/posts/${postId}`);
        setPost(fetchedPost);

        if (fetchedPost && fetchedPost.userId) {
          const fetchedUser = await fetchData(`https://jsonplaceholder.typicode.com/users/${fetchedPost.userId}`);
          setUser(fetchedUser);
        } else {
          setUser(null); // No user found or post doesn't have userId
        }
      } catch (err) {
        setError(`Failed to load post details for ID ${postId}. ` + err.message);
        setPost(null); // Clear post if error
        setUser(null); // Clear user if error
      } finally {
        setLoading(false);
      }
    };

    if (postId) {
      loadPostDetail();
    } else {
      // Handle case where postId is somehow missing (e.g., direct navigation to /posts/)
      setError("No post ID provided in URL.");
      setLoading(false);
    }
  }, [postId]); // Re-run effect when postId changes

  if (loading) return <div className="flex justify-center items-center h-full text-xl text-gray-600">Loading post details...</div>;
  if (error) return (
    <div className="text-red-500 text-center text-xl p-8">
      <p>Error: {error}</p>
      <button
        onClick={() => navigate('/')}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
      >
        Go to Dashboard
      </button>
    </div>
  );
  if (!post) return <div className="text-gray-600 text-center text-xl p-8">Post not found.</div>;

  return (
    <div className="p-8 flex-grow overflow-auto">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">{post.title}</h2>
      {user && (
        <div className="mb-6 bg-blue-50 p-4 rounded-lg shadow-inner">
          <h3 className="text-xl font-semibold text-blue-700 mb-2">Author Information</h3>
          <p className="text-gray-700"><strong>Name:</strong> {user.name}</p>
          <p className="text-gray-700"><strong>Username:</strong> {user.username}</p>
          <p className="text-gray-700"><strong>Email:</strong> {user.email}</p>
          <p className="text-gray-700"><strong>Website:</strong> <a href={`http://${user.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{user.website}</a></p>
        </div>
      )}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold text-gray-700 mb-3">Post Content</h3>
        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{post.body}</p>
      </div>
      <button
        onClick={() => navigate('/')}
        className="mt-8 px-6 py-3 bg-gray-600 text-white rounded-lg shadow-md hover:bg-gray-700 transition-colors duration-200"
      >
        &larr; Back to Dashboard
      </button>
    </div>
  );
};

// Main Application Layout
function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-gray-100 font-inter">
        {/* Tailwind CSS and Font Import */}
	{/*  <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" /> */}

        <Sidebar />
        <main className="flex-grow flex flex-col">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/posts/:postId" element={<PostDetail />} />
            {/* Add more routes here as needed */}
            <Route path="*" element={<div className="p-8 text-center text-2xl text-gray-600">404 - Page Not Found</div>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
