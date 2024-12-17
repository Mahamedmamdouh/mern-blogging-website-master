import { useEffect, useRef, useState } from "react";

export let activeTableLineRef;
export let activeTabRef;

const InPageNavigation=({routes,defaultHidden=[], defaultActiveIndex = 0, children})=>{

          activeTableLineRef=useRef();
          activeTabRef=useRef();
      
          let [inPageNavIndex,setInPageNavIndex]=useState(defaultActiveIndex);
      
          const changePageState =(btn,i)=>{

            let {offsetWidth,offsetLeft} =btn;

            activeTableLineRef.current.style.width = offsetWidth + "px"
            activeTableLineRef.current.style.left = offsetLeft+ "px"

            setInPageNavIndex(i)

      }

      useEffect(()=>{
            changePageState(activeTabRef.current,defaultActiveIndex)
      },[])
      return(
            <>
            <div className="relative mb-8 bg-white border-b border-grey
                            flex flex-nowrap overflow-x-auto">

                              {
                                    routes.map((route,i)=>{
                                          return(
                                                <button
                                                key={i}
                                                ref={i === defaultActiveIndex ? activeTabRef : null}
                                                className={`p-4 capitalize ${inPageNavIndex === i ? "text-black" : "text-dark-grey"} ${defaultHidden.includes(route) ? "md:hidden" : ""}`}

                                                onClick={(e) => changePageState(e.target, i)}
                                          >
                                                {route}
                                          </button>
                                          )
                                    })
                              }
                              <hr ref={activeTableLineRef} className="absolute bottom-0 duration-300 border-dark-grey"/>

            </div>

            {Array.isArray(children)?children[inPageNavIndex]:children}
            
            </>

      )
}

export default InPageNavigation


