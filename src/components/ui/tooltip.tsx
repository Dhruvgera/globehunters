import { Icon } from "lucide-react";
import { ReactNode } from "react";
import * as React from "react";
import "./styles.css";
import { HoverCard, HoverCardContent, HoverCardTrigger, HoverCardPortal } from '@radix-ui/react-hover-card';
import { QuestionMarkCircledIcon } from "@radix-ui/react-icons";
type propsType = {
    icon?: ReactNode;
    content: ReactNode | string;
}
export function Tooltip(props: propsType) {


    return (
        <HoverCard>
            <HoverCardTrigger asChild>
                <span>{props.icon ? props.icon : <QuestionMarkCircledIcon />}</span>
            </HoverCardTrigger>
            <HoverCardPortal>
                <HoverCardContent className="HoverCardContent" sideOffset={5}>

                    <div>{props.content}</div>

                </HoverCardContent>
            </HoverCardPortal>
        </HoverCard>
    );

}
