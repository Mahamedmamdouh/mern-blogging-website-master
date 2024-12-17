/*const LoadMoreDataBtn =({state,fetchDataFun})=>{
      if(state!=null && state.totalDocs > state.results.length){
            return(
                  <button
                  onClick={()=>fetchDataFun({page:state.page +1})}
                  className="text-dark-grey p-2 px-3 hover:bg-grey/30 rounded-md flex items-center gap-2">
                        Load More
                  </button>
            )
      }

}

export default LoadMoreDataBtn
*/
const LoadMoreDataBtn = ({ state, fetchDataFun, additionalParam}) => {
      if (!state || !state.results || state.results.length === undefined) {
        return null; // Safeguard for undefined or invalid state
      }
    
      if (state.totalDocs > state.results.length) {
        return (
          <button
            onClick={() => fetchDataFun({...additionalParam, page: state.page + 1 })}
            className="text-dark-grey p-2 px-3 hover:bg-grey/30 rounded-md flex items-center gap-2"
          >
            Load More
          </button>
        );
      }
    
      return null; // Return nothing if there's no need to load more
    };
    
    export default LoadMoreDataBtn;
    