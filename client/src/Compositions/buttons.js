import "../style/buttons.css"
import { Link } from "react-router";
export default function Button(props) {
    if (props.kind==="fri") {
        return(
   <Link to={props.link}> <button className="fri" style={{ height: `${props.height}px`, width: `${props.width}px` }}>{props.text}</button></Link>
        )
    } else if(props.kind==="sco") {
        return(
   <Link to={props.link}> <button className="sco" style={{ height: `${props.height}px`, width: `${props.width}px` }}>{props.text}</button></Link> 

        )
    }else{
          return  <Link to={props.link}><button className="thr" style={{ height: `${props.height}px`, width: `${props.width}px` }}>{props.text}</button></Link> 
    }
}