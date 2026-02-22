import { Request,Response } from 'express';
import prisma from '../lib/prisma.js';
import openai from '../configs/openai.js';


// ================= MAKE REVISION =================
export const makeRevision= async (req: Request,res:Response) => {
 const userId = req.UserId;
 try {
   const projectId = req.params.projectId as string;
   const { messages } = req.body ;

   const user = await prisma.user.findUnique({ where:{ id:userId }});
   if (!userId || !user) return res.status(401).json({ message:'Unauthorized'});
   if(user.credits < 5) return res.status(403).json({ message:'Insufficient credits'});
   if(!messages || messages.trim()==='') return res.status(400).json({ message:'Please enter a valid prompt'});

   const project = await prisma.websiteProject.findFirst({
      where:{ id:projectId, userId }
   });
   if(!project) return res.status(404).json({ message:'Project not found'});

   await prisma.conversation.create({
     data:{ role:'user', content:messages, projectId }
   });

   await prisma.user.update({
     where:{id:userId},
     data:{ credits:{ decrement:5 }}
   });

   // enhance prompt
   const enhance = await openai.chat.completions.create({
      model:"stepfun/step-3.5-flash:free",
      messages:[
        { role:"system", content:"Enhance this website change request."},
        { role:"user", content:messages }
      ]
   });

   const enhancedPrompt = enhance.choices[0].message.content || messages;

   // generate code
   const generate = await openai.chat.completions.create({
      model:"stepfun/step-3.5-flash:free",
      messages:[
        {
          role:"system",
          content:`You are an expert web developer.
You may rebuild the page completely.
Remove demo content.
Use Tailwind CSS.
Return FULL HTML only.`
        },
        {
          role:"user",
          content:`CURRENT CODE:\n${project.current_code}\n\nREQUEST:\n${enhancedPrompt}`
        }
      ]
   });

   const rawCode = generate.choices[0].message.content || '';
   if(!rawCode) return res.status(500).json({message:"AI failed"});

   const code = rawCode.replace(/```[a-z]*\n?/gi,'').replace(/```$/g,'').trim();

   const version = await prisma.version.create({
     data:{ code, description:"changes made", projectId }
   });

   await prisma.websiteProject.update({
     where:{ id:projectId },
     data:{ current_code:code, current_version_index:version.id }
   });

   res.json({ message:"Changes made successfully"});

 } catch(err:any){
   res.status(500).json({ message:err.message });
 }
};


// ================= ROLLBACK =================
export const rollbackToVersion = async (req:Request,res:Response)=>{
 try{
   const userId=req.UserId;
   const {projectId,versionId}=req.params;

   const project=await prisma.websiteProject.findFirst({
     where:{id:projectId,userId},
     include:{versions:true}
   });
   if(!project) return res.status(404).json({message:"Project not found"});

   const version=project.versions.find(v=>v.id===versionId);
   if(!version) return res.status(404).json({message:"Version not found"});

   await prisma.websiteProject.update({
     where:{id:projectId},
     data:{ current_code:version.code, current_version_index:version.id }
   });

   res.json({message:"Rollback successful"});
 }catch(err:any){
   res.status(500).json({message:err.message});
 }
};


// ================= DELETE PROJECT =================
export const deleteProject = async (req:Request,res:Response)=>{
 try{
   const userId=req.UserId;
   const {projectId}=req.params;

   await prisma.websiteProject.deleteMany({
     where:{ id:projectId, userId }
   });

   res.json({message:"Project deleted successfully"});
 }catch(err:any){
   res.status(500).json({message:err.message});
 }
};


// ================= PREVIEW =================
export const getProjectPreview = async (req:Request,res:Response)=>{
 try{
   const userId=req.UserId;
   const {projectId}=req.params;

   const project=await prisma.websiteProject.findFirst({
     where:{ id:projectId, userId }
   });
   if(!project) return res.status(404).json({message:"Project not found"});

   res.json({project});
 }catch(err:any){
   res.status(500).json({message:err.message});
 }
};


// ================= PUBLIC PROJECT =================
export const getProjectById = async (req:Request,res:Response)=>{
 try{
   const {projectId}=req.params;
   const project=await prisma.websiteProject.findFirst({
     where:{ id:projectId, isPublished:true }
   });
   if(!project) return res.status(404).json({message:"Not found"});
   res.json({code:project.current_code});
 }catch(err:any){
   res.status(500).json({message:err.message});
 }
};


// ================= LIST PUBLIC PROJECTS =================
export const getPublishedProjects = async (req:Request,res:Response)=>{
 const projects=await prisma.websiteProject.findMany({
   where:{ isPublished:true },
   include:{ user:true }
 });
 res.json({projects});
};


// ================= SAVE CODE =================
export const saveProjectCode = async (req:Request,res:Response)=>{
 try{
   const userId=req.UserId;
   const {projectId}=req.params;
   const {code}=req.body;

   const project=await prisma.websiteProject.findFirst({
     where:{ id:projectId, userId }
   });
   if(!project) return res.status(404).json({message:"Project not found"});

   await prisma.websiteProject.update({
     where:{id:projectId},
     data:{ current_code:code }
   });

   res.json({message:"Project saved"});
 }catch(err:any){
   res.status(500).json({message:err.message});
 }
};

// ================= UPDATE PUBLISH STATUS =================
export const updatePublishStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.UserId;
    const { projectId } = req.params;
    const { isPublished } = req.body;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const project = await prisma.websiteProject.findFirst({
      where: { id: projectId, userId }
    });

    if (!project)
      return res.status(404).json({ message: "Project not found" });

    const updatedProject = await prisma.websiteProject.update({
      where: { id: projectId },
      data: { isPublished }
    });

    res.json({
      message: isPublished ? "Project published successfully" : "Project unpublished successfully",
      project: updatedProject
    });

  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
