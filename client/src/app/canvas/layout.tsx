import AppBar from "@/components/AppBar";

export default function Layout({children}:{
    children:React.ReactNode
}){
    return(
        <>
        <AppBar/>
        {children}
        </>
    )
}