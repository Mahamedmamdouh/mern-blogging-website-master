import { Link, Outlet, useNavigate } from "react-router-dom";
import darkLogo from '../imgs/logo.png';
import lightLogo from "../imgs/logo-light.png";
import { useContext, useState, useEffect, useRef } from "react";
import { ThemeContext, UserContext } from "../App";
import UserNavigationPanel from "./user-navigation.component";
import axios from "axios";
import { storeInSession } from "../common/session";

const Navbar = () => {
  const [SearchBoxVisibility, SetSearchBoxVisibility] = useState(false);
  const [userNavPanel, setUserNavPanel] = useState(false);
  const{theme,setTheme} = useContext(ThemeContext)
  const { userAuth,setUserAuth} = useContext(UserContext);
  
  let navigate=useNavigate()

  const navPanelRef = useRef(null); // Add a ref to track the user navigation panel

  const access_token = userAuth?.access_token;
  const profile_img = userAuth?.profile_img;
  const new_notification_available =userAuth?.new_notification_available 

  const handleUserNavPanel = () => {
    setUserNavPanel((currentVal) => !currentVal);
  };

  const handleSearch=(e)=>{

    let query=e.target.value;

    if(e.keyCode ===13 && query.length){
      navigate(`/search/${query}`)
    }


  }



  // Handle clicks outside of the user navigation panel to close it
  const handleClickOutside = (event) => {
    if (navPanelRef.current && !navPanelRef.current.contains(event.target)) {
      setUserNavPanel(false);
    }
  };

  // Add and remove the global click listener
 
  // Combined useEffect for managing clicks outside the user navigation panel
  // and fetching new notifications.
  useEffect(() => {
    // Handle clicks outside of the user navigation panel to close it
    const handleClickOutside = (event) => {
      if (navPanelRef.current && !navPanelRef.current.contains(event.target)) {
        setUserNavPanel(false);
      }
    };

    if (userNavPanel) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    // Fetch notifications if user is logged in
    if (access_token) {
     
      axios.get(
          `${import.meta.env.VITE_SERVER_DOMAIN}/new-notification`,
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          }
        )
        .then(({ data }) => {
          
          setUserAuth({ ...userAuth, ...data });
        })
        .catch((err) => console.error(err));
    }

       // Cleanup event listener on unmount
       return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [userNavPanel, access_token]); // Dependencies: userNavPanel and access_token

    const changeTheme =()=>{
      let newTheme = theme ==='light' ? 'dark':'light';

      setTheme(newTheme);

      document.body.setAttribute('data-theme',newTheme);

      storeInSession('theme',newTheme)
    }
  
 
  return (
    <>
      <nav className="navbar z-50">
        <Link to="/" className="flex-none w-10">
          <img src={theme === 'light' ? darkLogo: lightLogo} className="w-full" />
        </Link>

        <div
          className={`absolute bg-white w-full left-0 top-full mt-0 border-b border-grey py-4 px-[5vw] md:border-0 md:block md:relative 
                md:inset-0 md:p-0 md:w-auto md:show ${
                  SearchBoxVisibility ? "block" : "hidden"
                }`}
        >
          <input
            type="text"
            placeholder="Search"
            className="w-full bg-grey p-4 pl-6 md:w-auto md:pr-6 pr-[12%] placeholder:text-dark-grey rounded-full  md:pl-12"
            onKeyDown={handleSearch}
          />
          <i className="fi fi-rr-search absolute text-xl right-[10%] top-1/2 -translate-y-1/2 md:left-5 md:pointer-events-none text-dark-grey"></i>
        </div>

        <div className="flex items-center gap-3 md:gap-6 ml-auto">
          <button
            className="md:hidden bg-grey rounded-full w-12 h-12 flex items-center justify-center"
            onClick={() => SetSearchBoxVisibility((currentVal) => !currentVal)}
          >
            <i className="fi fi-rr-search text-xl"></i>
          </button>

          <Link to="/editor" className="hidden md:flex gap-2 link">
            <i className="fi fi-rr-edit"></i>
            <p>Write</p>
          </Link>

          <button className="w-12 h-12 rounded-full bg-grey relative hover:bg-black/10"
          onClick={changeTheme}>
                  <i className={`fi fi-rr-${theme === "light" ? "moon-stars" : "sun"} text-2xl block mt-1`}></i>

                </button>

          {access_token ? (
            <>
              <Link to="/dashboard/notifications">
                <button className="w-12 h-12 rounded-full bg-grey relative hover:bg-black/10">
                  <i className="fi fi-rr-bell text-2xl block mt-1"></i>
                 {
                  new_notification_available ?
                    <span className="bg-red w-3 h-3 rounded-full absolute top-2
                     right-2 z-10"></span>:''
                 }
                </button>
              </Link>

              <div className="relative" ref={navPanelRef}>
                <button
                  className="w-12 h-12 mt-1"
                  onClick={handleUserNavPanel} // Toggle panel on click
                >
                  <img
                    src={profile_img}
                    className="w-full h-full object-cover rounded-full"
                  />
                </button>
                {userNavPanel ? <UserNavigationPanel /> : ""}
              </div>
            </>
          ) : (
            <>
              <Link to="/signin" className="btn-dark py-2">
                Sign In
              </Link>

              <Link to="/signup" className="btn-light hidden md:block py-2">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>
      <Outlet />
    </>
  );
};

export default Navbar;




/*

import { Link, Outlet, useNavigate } from "react-router-dom";
import logo from "../imgs/logo.png";
import { useContext, useState, useEffect, useRef } from "react";
import { UserContext } from "../App";
import UserNavigationPanel from "./user-navigation.component";
import axios from "axios";

const Navbar = () => {
  const [SearchBoxVisibility, SetSearchBoxVisibility] = useState(false);
  const [userNavPanel, setUserNavPanel] = useState(false);
  const { userAuth,setUserAuth,new_notification_available } = useContext(UserContext);
  let navigate=useNavigate()

  const navPanelRef = useRef(null); // Add a ref to track the user navigation panel

  const access_token = userAuth?.access_token;
  const profile_img = userAuth?.profile_img;

  const handleUserNavPanel = () => {
    setUserNavPanel((currentVal) => !currentVal);
  };

  const handleSearch=(e)=>{

    let query=e.target.value;

    if(e.keyCode ===13 && query.length){
      navigate(`/search/${query}`)
    }


  }



  // Handle clicks outside of the user navigation panel to close it
  const handleClickOutside = (event) => {
    if (navPanelRef.current && !navPanelRef.current.contains(event.target)) {
      setUserNavPanel(false);
    }
  };

  // Add and remove the global click listener
 
  // Combined useEffect for managing clicks outside the user navigation panel
  // and fetching new notifications.
  useEffect(() => {
    // Handle clicks outside of the user navigation panel to close it
    const handleClickOutside = (event) => {
      if (navPanelRef.current && !navPanelRef.current.contains(event.target)) {
        setUserNavPanel(false);
      }
    };

    if (userNavPanel) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    // Fetch notifications if user is logged in
    if (access_token) {
      axios
        .post(
          `${import.meta.env.VITE_SERVER_DOMAIN}/new-notification`,
          {import { admin } from 'firebase-admin';

            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          }
        )
        .then(({ data }) => {
          setUserAuth({ ...userAuth, ...data });
        })
        .catch((err) => console.error(err));
    }

       // Cleanup event listener on unmount
       return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [userNavPanel, access_token]); // Dependencies: userNavPanel and access_token
  
 
  return (
    <>
      <nav className="navbar z-50">
        <Link to="/" className="flex-none w-10">
          <img src={logo} className="w-full" />
        </Link>

        <div
          className={`absolute bg-white w-full left-0 top-full mt-0 border-b border-grey py-4 px-[5vw] md:border-0 md:block md:relative 
                md:inset-0 md:p-0 md:w-auto md:show ${
                  SearchBoxVisibility ? "block" : "hidden"
                }`}
        >
          <input
            type="text"
            placeholder="Search"
            className="w-full bg-grey p-4 pl-6 md:w-auto md:pr-6 pr-[12%] placeholder:text-dark-grey rounded-full  md:pl-12"
            onKeyDown={handleSearch}
          />
          <i className="fi fi-rr-search absolute text-xl right-[10%] top-1/2 -translate-y-1/2 md:left-5 md:pointer-events-none text-dark-grey"></i>
        </div>

        <div className="flex items-center gap-3 md:gap-6 ml-auto">
          <button
            className="md:hidden bg-grey rounded-full w-12 h-12 flex items-center justify-center"
            onClick={() => SetSearchBoxVisibility((currentVal) => !currentVal)}
          >
            <i className="fi fi-rr-search text-xl"></i>
          </button>

          <Link to="/editor" className="hidden md:flex gap-2 link">
            <i className="fi fi-rr-edit"></i>
            <p>Write</p>
          </Link>

          {access_token ? (
            <>
              <Link to="/dashboard/notification">
                <button className="w-12 h-12 rounded-full bg-grey relative hover:bg-black/10">
                  <i className="fi fi-rr-bell text-2xl block mt-1"></i>
                 {
                  new_notification_available?
                    <span className="bg-red w-3 h-3 rounded-full absolute top-2
                     right-2 z-10"></span>:''
                 }
                </button>
              </Link>

              <div className="relative" ref={navPanelRef}>
                <button
                  className="w-12 h-12 mt-1"
                  onClick={handleUserNavPanel} // Toggle panel on click
                >
                  <img
                    src={profile_img}
                    className="w-full h-full object-cover rounded-full"
                  />
                </button>
                {userNavPanel ? <UserNavigationPanel /> : ""}
              </div>
            </>
          ) : (
            <>
              <Link to="/signin" className="btn-dark py-2">
                Sign In
              </Link>

              <Link to="/signup" className="btn-light hidden md:block py-2">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>
      <Outlet />
    </>
  );
};

export default Navbar;





*/