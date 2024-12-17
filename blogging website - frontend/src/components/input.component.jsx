import { useState } from "react"

const InputBox =({name,id,type,value,placeholder,icon,disable=false.toString()})=>{
      const[passwordVisible,setPasswordVisible]=useState(false)
      return(
            <div className="relative w-[100%] mb-4">
                  <input 
                         name={name}
                         type={type =="password"? passwordVisible ?
                                       "text":"password":type}
                         placeholder={placeholder}
                         defaultValue={value}
                         id={id}
                         disable={disable}
                         className="input-box"
                          />
                         <i className={`fi ${icon} input-icon`}></i>

                         {
                              type=="password"?
                              <i  className={`fi ${passwordVisible ? "fi-rr-eye" : "fi-rr-eye-crossed"} input-icon left-[auto] right-4 cursor-pointer`}
                                            onClick={()=>setPasswordVisible(currentVal =>!currentVal)}
                                            >

                              </i>
                              :""

                         }
            </div>
            
      )

}
export  default InputBox