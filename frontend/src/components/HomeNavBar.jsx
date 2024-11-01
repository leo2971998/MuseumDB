// src/components/Navbar.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../css/HomeNavBar.css';
import logo from '../assets/LOGO.png';
import { CartContext } from './CartContext'; // Import CartContext for cart state
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'; // Import MUI cart icon

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { cartItems } = useContext(CartContext); // Get cart items from context
    const [navBackground, setNavBackground] = useState('transparent');

    const role = localStorage.getItem('role');
    const username = localStorage.getItem('username');

    // Function to handle the navbar background on scroll
    const handleScroll = () => {
        if (window.scrollY > 50) {
            setNavBackground('#352F36');
        } else {
            setNavBackground('transparent');
        }
    };

    // Add event listener on scroll if on the home page
    useEffect(() => {
        if (location.pathname === '/') {
            window.addEventListener('scroll', handleScroll);
            return () => {
                window.removeEventListener('scroll', handleScroll);
            };
        } else {
            setNavBackground('#352F36'); // Set navbar to black for non-home pages
        }
    }, [location.pathname]);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    return (
        <nav style={{ backgroundColor: navBackground }} className="navbar">
            <div className="navbar-container">
                {/* Left Side: Logo and Navigation Links */}
                <div className="left-side">
                    <img onClick={() => navigate('/')} src={logo} alt="MFAH" className="logo" />
                    <ul className="nav-links">
                        <li><a href="/Visit">Visit</a></li>
                        <li><a href="/ExhibitionsAndEvents">Exhibitions and Events</a></li>
                        <li><a href="/Art">Art</a></li>
                        <li><a href="/MFAShop">MFA Shop</a></li>
                        {role === 'admin' && (
                            <li><a href="/giftshop-admin">Manage Gift Shop</a></li>
                        )}
                    </ul>
                </div>

                {/* Right Side: Buttons and Cart Icon */}
                <div className="nav-buttons">
                    {role ? (
                        <>
                            <span className="welcome-message">Welcome, {username}!</span>
                            <button onClick={() => navigate('/profile')} className="btn-outline">Profile</button>
                            <button onClick={handleLogout} className="btn-outline">Logout</button>
                        </>
                    ) : (
                        <>
                            <a href="/BecomeAMember" className="becomeamember">Become a Member</a>
                            <button onClick={() => navigate('/BuyTickets')} className="btn-outline">Buy Tickets</button>
                            <button onClick={() => navigate('/login')} className="btn-outline">Login</button>
                            <button onClick={() => navigate('/register')} className="btn-outline">Register</button>
                        </>
                    )}
                    {/* Conditionally show the cart icon on certain pages */}
                    {location.pathname !== '/checkout' && (
                        <div className="cart-icon" onClick={() => navigate('/cart')}>
                            <ShoppingCartIcon fontSize="large" style={{ color: '#FFFFFF' }} />
                            {cartItems.length > 0 && <span className="cart-count">{cartItems.length}</span>}
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
