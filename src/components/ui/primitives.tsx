import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { AlertCircle, CheckCircle2, ImagePlus, Search, Upload } from "lucide-react";

function cx(...values:(string|undefined|false)[]){return values.filter(Boolean).join(" ")}

export function Button({className,variant="primary",...props}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:"primary"|"secondary"|"danger"|"ghost"}){return <button className={cx("ui-button",`ui-button--${variant}`,className)} {...props}/>}
export function IconButton({className,...props}:ButtonHTMLAttributes<HTMLButtonElement>){return <button className={cx("ui-icon-button",className)} {...props}/>}
export function Card({className,...props}:HTMLAttributes<HTMLElement>){return <section className={cx("ui-card",className)} {...props}/>}
export function PageHeader({eyebrow,title,description,children}:{eyebrow?:string;title:string;description?:string;children?:React.ReactNode}){return <header className="page-header"><div>{eyebrow?<p className="eyebrow">{eyebrow}</p>:null}<h1>{title}</h1>{description?<p className="muted">{description}</p>:null}</div>{children}</header>}
export function SectionHeader({title,description,action}:{title:string;description?:string;action?:React.ReactNode}){return <div className="section-header"><div><h2>{title}</h2>{description?<p className="muted">{description}</p>:null}</div>{action}</div>}
export function Badge({children,tone="neutral"}:{children:React.ReactNode;tone?:"neutral"|"success"|"warning"|"danger"|"info"}){return <span className={`ui-badge ui-badge--${tone}`}>{children}</span>}
export function StatusBadge({label,tone="neutral"}:{label:string;tone?:"neutral"|"success"|"warning"|"danger"|"info"}){return <Badge tone={tone}><span aria-hidden>●</span>{label}</Badge>}
export function Avatar({name,src}:{name:string;src?:string|null}){return src?<span className="ui-avatar" role="img" aria-label={`${name} profil fotoğrafı`} style={{backgroundImage:`url(${src})`,backgroundSize:"cover",backgroundPosition:"center"}}/>:<span className="ui-avatar ui-avatar--fallback" aria-label={name}>{name.split(" ").map(x=>x[0]).slice(0,2).join("")}</span>}
export function Input({className,...props}:InputHTMLAttributes<HTMLInputElement>){return <input className={cx("ui-input",className)} {...props}/>}
export function Textarea({className,...props}:TextareaHTMLAttributes<HTMLTextAreaElement>){return <textarea className={cx("ui-input ui-textarea",className)} {...props}/>}
export function Select({className,...props}:SelectHTMLAttributes<HTMLSelectElement>){return <select className={cx("ui-input",className)} {...props}/>}
export function SearchInput(props:InputHTMLAttributes<HTMLInputElement>){return <label className="ui-search"><Search size={18}/><input aria-label="Ara" placeholder="Ara..." {...props}/></label>}
export function Checkbox(props:InputHTMLAttributes<HTMLInputElement>){return <input className="ui-check" type="checkbox" {...props}/>}
export function Radio(props:InputHTMLAttributes<HTMLInputElement>){return <input className="ui-check" type="radio" {...props}/>}
export function DatePicker(props:InputHTMLAttributes<HTMLInputElement>){return <Input type="date" {...props}/>}
export function TimePicker(props:InputHTMLAttributes<HTMLInputElement>){return <Input type="time" {...props}/>}
export function FileUploader(props:InputHTMLAttributes<HTMLInputElement>){return <label className="ui-uploader"><Upload/><span>Dosya seçin veya buraya bırakın</span><input className="sr-only" type="file" {...props}/></label>}
export function ImageUploader(props:InputHTMLAttributes<HTMLInputElement>){return <label className="ui-uploader"><ImagePlus/><span>Fotoğraf çekin veya galeriden seçin</span><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" {...props}/></label>}
export function Tabs({items}:{items:{label:string;active?:boolean}[]}){return <div className="ui-tabs" role="tablist">{items.map(item=><button key={item.label} role="tab" aria-selected={item.active}>{item.label}</button>)}</div>}
export function EmptyState({title,description,action}:{title:string;description:string;action?:React.ReactNode}){return <div className="empty-state"><AlertCircle/><h3>{title}</h3><p className="muted">{description}</p>{action}</div>}
export function Skeleton({className}:{className?:string}){return <span className={cx("ui-skeleton",className)} aria-label="Yükleniyor"/>}
export function Toast({message}:{message:string}){return <div className="ui-toast" role="status"><CheckCircle2/>{message}</div>}
export function Modal({title,children}:{title:string;children:React.ReactNode}){return <div className="ui-overlay" role="dialog" aria-modal="true" aria-label={title}><Card><h2>{title}</h2>{children}</Card></div>}
export function BottomSheet({title,children}:{title:string;children:React.ReactNode}){return <div className="ui-overlay ui-overlay--bottom" role="dialog" aria-modal="true" aria-label={title}><Card><span className="sheet-handle"/><h2>{title}</h2>{children}</Card></div>}
export const Drawer=Modal;
export function ConfirmDialog({title,description,children}:{title:string;description:string;children?:React.ReactNode}){return <Modal title={title}><p className="muted">{description}</p>{children}</Modal>}
export function DropdownMenu({label,children}:{label:string;children:React.ReactNode}){return <details className="ui-dropdown"><summary>{label}</summary><div>{children}</div></details>}
export function MultiSelect({children,...props}:SelectHTMLAttributes<HTMLSelectElement>){return <Select multiple {...props}>{children}</Select>}
