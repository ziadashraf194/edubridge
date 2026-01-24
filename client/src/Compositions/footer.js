import "../style/footer.css"


export default function Footer() {
    
    return(
        <>
         <footer>
            <div className="media-icons">
                <a href="#"><i className="fa-brands fa-facebook fa-2xl"></i></a>
                <a href="#"><i className="fa-brands fa-instagram fa-2xl"></i></a>
                <a href="#"><i className="fa-brands fa-whatsapp fa-2xl"></i></a>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 180"><path d="M714.7 40H146.5a140 140 0 0 0-125.2 77.4 15.6 15.6 0 0 0 14 22.6h568.2c53 0 101.5-30 125.2-77.4a15.6 15.6 0 0 0-14-22.6Z" fill="#6356E5"></path></svg>
               <p> All rights reserved {new Date().getFullYear()}©</p>
         </footer>
        </>
    )
}