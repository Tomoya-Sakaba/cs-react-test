import { Link } from "react-router-dom";

type Props = {
  icon: string;
  href: string;
  name: string;
  isHovered: boolean;
};

const NavigationItem = ({ icon, href, name, isHovered }: Props) => {
  return (
    <>
      <Link
        to={href}
        className="relative mb-4 flex h-12 items-center duration-300 hover:translate-x-3"
      >
        <span
          className={`${icon} text-4xl flex-shrink-0 absolute left-0.5`}
        ></span>
        <div className="overflow-hidden">
          <span
            className={`text-xl whitespace-nowrap transition-all duration-500 ${isHovered ? "ml-16 opacity-100" : "-ml-32 opacity-0"
              }`}
          >
            {name}
          </span>
        </div>
      </Link>
    </>
  );
};

export default NavigationItem;
